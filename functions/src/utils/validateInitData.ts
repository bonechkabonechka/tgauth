import * as crypto from 'crypto';

export interface ParsedInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  auth_date: number;
  hash: string;
}

/**
 * Валидирует initData от Telegram Mini App
 * @param initData - строка initData от Telegram
 * @param botToken - токен бота
 * @returns true если данные валидны
 */
export function validateInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return false;
    }

    urlParams.delete('hash');

    // Сортируем параметры
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем хеш
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверяем подпись
    return calculatedHash === hash;
  } catch (error) {
    console.error('Ошибка валидации initData:', error);
    return false;
  }
}

/**
 * Парсит initData и извлекает данные пользователя
 * @param initData - строка initData от Telegram
 * @returns распарсенные данные или null
 */
export function parseInitData(initData: string): ParsedInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    const authDate = urlParams.get('auth_date');
    const hash = urlParams.get('hash');

    if (!userParam || !authDate || !hash) {
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userParam));

    return {
      user,
      auth_date: parseInt(authDate, 10),
      hash,
    };
  } catch (error) {
    console.error('Ошибка парсинга initData:', error);
    return null;
  }
}