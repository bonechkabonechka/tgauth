import { useState, useEffect } from 'react';
import { useAuthContext } from './AuthProvider';
import { API_URL } from '../config/api';

export function BrowserAuth() {
  const { checkAuth, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      checkAuth();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkAuth]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

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

      setAuthToken(data.token);
      window.open(data.botUrl, '_blank');

      const interval = setInterval(async () => {
        try {
          const verifyResponse = await fetch(`${API_URL}/auth/browser/verify?token=${data.token}`);
          
          if (!verifyResponse.ok) {
            return;
          }

          const verifyData = await verifyResponse.json();

          if (verifyData.status === 'completed') {
            clearInterval(interval);
            setPollingInterval(null);
            setAuthToken(null);
            await checkAuth();
          } else if (verifyData.status === 'expired' || verifyData.status === 'not_found') {
            clearInterval(interval);
            setPollingInterval(null);
            setAuthToken(null);
            setError('Сессия истекла. Попробуйте еще раз.');
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Error polling auth status:', err);
        }
      }, 2000);

      setPollingInterval(interval);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate auth';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div>
      <h1>Вход через Telegram</h1>
      
      {error && (
        <div>
          {error}
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? 'Ожидание авторизации...' : 'Войти через Telegram'}
      </button>

      {isLoading && authToken && (
        <p>
          Откройте бота в Telegram и нажмите Start
        </p>
      )}
    </div>
  );
}