import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthSession, isSessionExpired, markSessionAsUsed } from '../../db/authSessions.js';
import { initDatabase } from '../../db/init.js';

/**
 * GET /api/auth/browser/verify?token=UUID
 * Проверяет статус авторизации по UUID токену
 * Используется фронтендом для polling
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
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const token = request.query.token as string;

    if (!token) {
      response.status(400).json({ error: 'token is required' });
      return;
    }

    // Получаем сессию из БД
    const session = await getAuthSession(token);

    if (!session) {
      response.status(404).json({ 
        status: 'not_found',
        message: 'Session not found' 
      });
      return;
    }

    // Проверяем, не истекла ли сессия
    if (isSessionExpired(session)) {
      response.status(200).json({
        status: 'expired',
        message: 'Session expired',
      });
      return;
    }

    // Если сессия завершена - возвращаем токены
    if (session.status === 'completed' && session.access_token && session.refresh_token) {
      // Помечаем сессию как использованную (опционально)
      await markSessionAsUsed(token);

      response.status(200).json({
        status: 'completed',
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      return;
    }

    // Сессия еще в процессе (pending)
    response.status(200).json({
      status: 'pending',
      message: 'Waiting for authorization...',
    });
  } catch (error) {
    console.error('Error in browser auth verify:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}