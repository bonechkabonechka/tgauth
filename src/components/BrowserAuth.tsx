import { useState, useEffect } from 'react';
import { useAuthContext } from './AuthProvider';
import { API_URL } from '../config/api';

/**
 * Компонент для авторизации через браузер (не Mini App)
 * Показывает кнопку "Войти через Telegram" и обрабатывает авторизацию
 */
export function BrowserAuth() {
  const { checkAuth, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Проверяем, есть ли токен в URL (callback после авторизации)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Если есть токен в URL - это callback, проверяем авторизацию
      checkAuth();
      // Убираем token из URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkAuth]);

  // Очистка polling при размонтировании
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Останавливаем polling если авторизованы
  useEffect(() => {
    if (isAuthenticated && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      setAuthToken(null);
    }
  }, [isAuthenticated, pollingInterval]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Создаем сессию авторизации
      const response = await fetch(`${API_URL}/auth/browser/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.token || !data.botUrl) {
        throw new Error('Invalid response from server');
      }

      // 2. Сохраняем токен для polling
      setAuthToken(data.token);

      // 3. Открываем ссылку на бота
      window.open(data.botUrl, '_blank');

      // 4. Начинаем polling для проверки статуса
      const interval = setInterval(async () => {
        try {
          const verifyResponse = await fetch(`${API_URL}/auth/browser/verify?token=${data.token}`);
          
          if (!verifyResponse.ok) {
            return;
          }

          const verifyData = await verifyResponse.json();

          if (verifyData.status === 'completed') {
            // Авторизация завершена - останавливаем polling
            clearInterval(interval);
            setPollingInterval(null);
            setAuthToken(null);

            // Проверяем авторизацию (получаем данные пользователя)
            await checkAuth();
          } else if (verifyData.status === 'expired' || verifyData.status === 'not_found') {
            // Сессия истекла или не найдена
            clearInterval(interval);
            setPollingInterval(null);
            setAuthToken(null);
            setError('Сессия истекла. Попробуйте еще раз.');
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Error polling auth status:', err);
        }
      }, 2000); // Проверяем каждые 2 секунды

      setPollingInterval(interval);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate auth';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Не показываем компонент если уже авторизованы
  if (isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      gap: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>
          Вход через Telegram
        </h1>
        
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '8px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#ccc' : '#0088cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            minWidth: '200px',
          }}
        >
          {isLoading ? 'Ожидание авторизации...' : 'Войти через Telegram'}
        </button>

        {isLoading && authToken && (
          <p style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#666',
          }}>
            Откройте бота в Telegram и нажмите Start
          </p>
        )}
      </div>
    </div>
  );
}