// URL для API (будет меняться в зависимости от окружения)
// В продакшене на Vercel: автоматически определяется (тот же домен)
// Для локальной разработки: используйте Vercel CLI (vercel dev)

const getApiUrl = () => {
    // Если есть переменная окружения - используем её
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // В режиме разработки используем относительный путь (работает с vercel dev)
    // Или можно указать локальный сервер: http://localhost:3000/api
    if (import.meta.env.DEV) {
      return '/api';
    }
    
    // В продакшене используем относительный путь (тот же домен на Vercel)
    return '/api';
  };
  
  export const API_URL = getApiUrl();