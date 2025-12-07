import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthSession, completeAuthSession, isSessionExpired } from '../../db/authSessions.js';
import { findOrCreateUser } from '../../db/users.js';
import { createTokens } from '../../utils/jwt.js';
import { initDatabase } from '../../db/init.js';

const SITE_URL = 'https://tgauth2.vercel.app'; // URL вашего сайта

/**
 * POST /api/auth/browser/complete
 * Вызывается ботом после авторизации пользователя
 * Body: { token: string, user: { tg_id, first_name, last_name?, username?, photo_url? } }
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  // Инициализируем БД при первом запросе
  try {
    await initDatabase();
  } catch (error) {
    console.error('Ошибка инициализации БД:', error);
  }

  // Настройка CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { token, user: telegramUser } = request.body;

    // 1. Проверяем наличие токена и данных пользователя
    if (!token || typeof token !== 'string') {
      response.status(400).json({ error: 'token is required' });
      return;
    }

    if (!telegramUser || !telegramUser.tg_id || !telegramUser.first_name) {
      response.status(400).json({ error: 'user data is required' });
      return;
    }

    // 2. Получаем сессию из БД
    const session = await getAuthSession(token);

    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    // 3. Проверяем статус сессии
    if (session.status !== 'pending') {
      response.status(400).json({ error: 'Session already completed or expired' });
      return;
    }

    // 4. Проверяем, не истекла ли сессия
    if (isSessionExpired(session)) {
      response.status(400).json({ error: 'Session expired' });
      return;
    }

    // 5. Находим или создаем пользователя в БД
    const user = await findOrCreateUser({
      tg_id: telegramUser.tg_id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      photo_url: telegramUser.photo_url,
    });

    if (!user) {
      response.status(500).json({ error: 'Failed to create or find user' });
      return;
    }

    // 6. Создаем JWT токены
    const { accessToken, refreshToken } = createTokens({
      id: user.id,
      tg_id: user.tg_id,
      roles: user.roles,
    });

    // 7. Сохраняем токены в сессию
    const success = await completeAuthSession(token, user.id, accessToken, refreshToken);

    if (!success) {
      response.status(500).json({ error: 'Failed to save tokens' });
      return;
    }

    // 8. Возвращаем успешный ответ с callback URL
    // Правильный путь: /api/auth/callback (API endpoint, не фронтенд)
    const callbackUrl = `${SITE_URL}/api/auth/callback?token=${token}`;

    response.status(200).json({
      success: true,
      callbackUrl, // URL для возврата пользователя на сайт
      message: 'Авторизация успешна! Нажмите кнопку чтобы вернуться на сайт.',
    });
  } catch (error) {
    console.error('Error in browser auth complete:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}