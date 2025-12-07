import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateInitData, parseInitData } from '../utils/validateInitData';
import { createTokens } from '../utils/jwt';
import { findOrCreateUser } from '../db/users';
import { initDatabase } from '../db/init';

const BOT_TOKEN = process.env.BOT_TOKEN || '';

/**
 * Эндпоинт для авторизации через Telegram Mini App
 * POST /api/auth/signin
 * Body: { initData: string }
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
    // 1. Получаем initData из тела запроса
    const { initData } = request.body;

    if (!initData || typeof initData !== 'string') {
      response.status(400).json({ error: 'initData is required' });
      return;
    }

    if (!BOT_TOKEN) {
      response.status(500).json({ error: 'BOT_TOKEN is not configured' });
      return;
    }

    // 2. Валидируем initData
    const isValid = validateInitData(initData, BOT_TOKEN);
    if (!isValid) {
      response.status(401).json({ error: 'Invalid initData signature' });
      return;
    }

    // 3. Парсим initData и извлекаем данные пользователя
    const parsedData = parseInitData(initData);
    if (!parsedData || !parsedData.user) {
      response.status(400).json({ error: 'Invalid initData format' });
      return;
    }

    const { user: telegramUser } = parsedData;

    // 4. Находим или создаем пользователя в БД
    const user = await findOrCreateUser({
      tg_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      photo_url: telegramUser.photo_url,
    });

    if (!user) {
      response.status(500).json({ error: 'Failed to create or find user' });
      return;
    }

    // 5. Создаем JWT токены
    const { accessToken, refreshToken } = createTokens({
      id: user.id,
      tg_id: user.tg_id,
      roles: user.roles,
    });

    // 6. Устанавливаем токены в HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,        // JavaScript не может прочитать
      secure: true,          // Только HTTPS (в продакшене)
      sameSite: 'strict' as const,  // Защита от CSRF
      maxAge: 7 * 24 * 60 * 60,  // 7 дней в секундах
      path: '/',
    };

    response.setHeader('Set-Cookie', [
      `ACCESS_TOKEN=${accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookieOptions.maxAge}; Path=/`,
      `REFRESH_TOKEN=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookieOptions.maxAge}; Path=/`,
    ]);

    // 7. Возвращаем успешный ответ с данными пользователя
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
    console.error('Error in signin:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

