import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAccessToken, refreshAccessToken } from '../utils/jwt.js';
import { getUserByTgId } from '../db/users.js';
import * as cookie from 'cookie';

/**
 * Защищенный эндпоинт - проверяет авторизацию и возвращает данные пользователя
 * GET /api/auth/protected
 * Cookies: ACCESS_TOKEN, REFRESH_TOKEN
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  // Настройка CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 1. Получаем токены из cookies
    const cookieHeader = request.headers.cookie || '';
    const cookies = cookie.parse(cookieHeader);
    const accessToken = cookies.ACCESS_TOKEN;
    const refreshToken = cookies.REFRESH_TOKEN;

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
      const maxAge = 7 * 24 * 60 * 60; // 7 дней в секундах
      response.setHeader('Set-Cookie', [
        `ACCESS_TOKEN=${newTokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`,
        `REFRESH_TOKEN=${newTokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`,
      ]);

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

