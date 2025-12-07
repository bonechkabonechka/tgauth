import { useEffect } from 'react';
import { useAuthContext } from './AuthProvider';

/**
 * Компонент для автоматической авторизации через Telegram Mini App
 * Получает initData от Telegram и отправляет на сервер для валидации
 */
export function MiniAppAuth() {
  const { signIn, checkAuth } = useAuthContext();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      // Telegram WebApp не найден - проверяем существующую авторизацию
      // (на случай если пользователь уже авторизован ранее)
      checkAuth();
      return;
    }

    // Инициализируем WebApp
    tg.ready();

    // Получаем initData
    const initData = tg.initData;

    if (!initData) {
      // initData недоступен - проверяем существующую авторизацию
      checkAuth();
      return;
    }

    // Отправляем на сервер для авторизации
    signIn(initData);
  }, [signIn, checkAuth]);

  // Этот компонент не рендерит ничего видимого
  // Он только инициализирует авторизацию
  return null;
}