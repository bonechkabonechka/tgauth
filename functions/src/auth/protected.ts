import * as functions from 'firebase-functions';
import { verifyAccessToken, refreshAccessToken } from '../utils/jwt';  // ← Убрали verifyRefreshToken
import { getUserByTgId } from '../db/users';

/**
 * Защищенный эндпоинт - проверяет авторизацию и возвращает данные пользователя
 * GET /api/auth/protected
 * Cookies: ACCESS_TOKEN, REFRESH_TOKEN
 */
export async function protectedEndpoint(
  request: functions.https.Request,
  response: functions.Response
): Promise<void> {
  try {
    // 1. Получаем токены из cookies
    const accessToken = request.cookies?.ACCESS_TOKEN;
    const refreshToken = request.cookies?.REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      response.status(401).json({ error: 'Unauthorized - no tokens' });
      return;
    }

    // 2. Пытаемся проверить access token
    let payload = verifyAccessToken(accessToken);

    // 3. Если access token истек, пытаемся обновить через refresh token
    if (!payload) {
      const newTokens = refreshAccessToken(refreshToken);

      if (!newTokens) {
        // Refresh token тоже невалиден - нужна повторная авторизация
        response.status(401).json({ error: 'Unauthorized - tokens expired' });
        return;
      }

      // Устанавливаем новые токены в cookies
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      };

      response.cookie('ACCESS_TOKEN', newTokens.accessToken, cookieOptions);
      response.cookie('REFRESH_TOKEN', newTokens.refreshToken, cookieOptions);

      // Верифицируем новый access token чтобы получить payload
      payload = verifyAccessToken(newTokens.accessToken);
    }

    if (!payload) {
      response.status(401).json({ error: 'Unauthorized - invalid token' });
      return;
    }

    // 4. Получаем актуальные данные пользователя из БД
    const user = await getUserByTgId(payload.tg_id);

    if (!user) {
      response.status(404).json({ error: 'User not found' });
      return;
    }

    // 5. Возвращаем данные пользователя
    response.status(200).json({
      success: true,
      user: {
        id: user.id,
        tg_id: user.tg_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error('Error in protected endpoint:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}