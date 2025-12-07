import * as functions from 'firebase-functions';
import { validateInitData, parseInitData } from '../utils/validateInitData';
import { createTokens } from '../utils/jwt';
import { findOrCreateUser } from '../db/users';

const BOT_TOKEN = process.env.BOT_TOKEN || '';

/**
 * Эндпоинт для авторизации через Telegram Mini App
 * POST /api/auth/signin
 * Body: { initData: string }
 */
export async function signin(
  request: functions.https.Request,
  response: functions.Response
): Promise<void> {
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
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 дней в миллисекундах
      path: '/',
    };

    response.cookie('ACCESS_TOKEN', accessToken, cookieOptions);
    response.cookie('REFRESH_TOKEN', refreshToken, cookieOptions);

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