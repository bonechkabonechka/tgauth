import { useState, useCallback, useEffect } from 'react';
import type {AuthState, AuthContextType } from '../types/auth';
import { API_URL } from '../config/api';

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

export function useAuth(): AuthContextType {
  const [state, setState] = useState<AuthState>(initialState);

  /**
   * Авторизация через initData от Telegram
   */
  const signIn = useCallback(async (initData: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Важно! Для отправки cookies
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: errorMessage,
      });
    }
  }, []);

  /**
   * Проверка авторизации (получение данных пользователя)
   */
  const checkAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_URL}/auth/protected`, {
        method: 'GET',
        credentials: 'include', // Важно! Для отправки cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Не авторизован - это нормально, просто сбрасываем состояние
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
          return;
        }

        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check auth';
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: errorMessage,
      });
    }
  }, []);

  /**
   * Выход из системы
   */
  const signOut = useCallback(async () => {
    // Просто сбрасываем состояние
    // Cookies будут удалены автоматически при истечении или можно добавить эндпоинт для удаления
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  // Автоматически проверяем авторизацию при загрузке
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    signIn,
    signOut,
    checkAuth,
  };
}