import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthSession, isSessionExpired, markSessionAsUsed } from '../db/authSessions.js';
import { initDatabase } from '../db/init.js';

/**
 * GET /api/auth/callback?token=UUID
 * Callback после авторизации в боте
 * Получает токены из сессии и устанавливает их в cookies
 * Затем редиректит на главную страницу
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

  try {
    const token = request.query.token as string;

    if (!token) {
      // Редирект на главную с ошибкой
      response.redirect(302, '/?error=missing_token');
      return;
    }

    // Получаем сессию из БД
    const session = await getAuthSession(token);

    if (!session) {
      response.redirect(302, '/?error=session_not_found');
      return;
    }

    // Проверяем, не истекла ли сессия
    if (isSessionExpired(session)) {
      response.redirect(302, '/?error=session_expired');
      return;
    }

    // Проверяем, что сессия завершена
    if (session.status !== 'completed' || !session.access_token || !session.refresh_token) {
      response.redirect(302, '/?error=session_not_completed');
      return;
    }

    // Устанавливаем токены в HTTP-only cookies
    const maxAge = 7 * 24 * 60 * 60; // 7 дней в секундах
    const isProduction = process.env.VERCEL_ENV === 'production';
    const cookieOptions = [
      `HttpOnly`,
      `SameSite=Strict`,
      `Max-Age=${maxAge}`,
      `Path=/`,
    ];
    
    // Secure только в production (HTTPS)
    if (isProduction) {
      cookieOptions.push('Secure');
    }

    response.setHeader('Set-Cookie', [
      `ACCESS_TOKEN=${session.access_token}; ${cookieOptions.join('; ')}`,
      `REFRESH_TOKEN=${session.refresh_token}; ${cookieOptions.join('; ')}`,
    ]);

    // Помечаем сессию как использованную
    await markSessionAsUsed(token);

    // Редирект на главную страницу
    response.redirect(302, '/');
  } catch (error) {
    console.error('Error in auth callback:', error);
    response.redirect(302, '/?error=internal_error');
  }
}