// URL для API (будет меняться в зависимости от окружения)
// В продакшене на своем сервере: автоматически определяется (тот же домен)
// Для локальной разработки: http://localhost:3000/api (Express сервер)

const getApiUrl = () => {
    // Если есть переменная окружения - используем её
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // В режиме разработки используем Express сервер на порту 3000
    if (import.meta.env.DEV) {
      return 'http://localhost:3000/api';
    }
    
    // В продакшене используем относительный путь (тот же домен)
    return '/api';
  };
  
  export const API_URL = getApiUrl();