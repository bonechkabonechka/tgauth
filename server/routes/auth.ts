import { Router, type Request, type Response } from 'express';
import { validateInitData, parseInitData } from '../utils/validateInitData';
import { createTokens, verifyAccessToken, refreshAccessToken } from '../utils/jwt';
import { findOrCreateUser, getUserByTgId } from '../db/users';

const router = Router();
const BOT_TOKEN = process.env.BOT_TOKEN || '';

/**
 * POST /api/auth/signin
 * Авторизация через Telegram Mini App
 */
router.post('/signin', async (req: Request, res: Response) => {
  try {
    // 1. Получаем initData из тела запроса
    const { initData } = req.body;

    if (!initData || typeof initData !== 'string') {
      res.status(400).json({ error: 'initData is required' });
      return;
    }

    if (!BOT_TOKEN) {
      res.status(500).json({ error: 'BOT_TOKEN is not configured' });
      return;
    }

    // 2. Валидируем initData
    const isValid = validateInitData(initData, BOT_TOKEN);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid initData signature' });
      return;
    }

    // 3. Парсим initData и извлекаем данные пользователя
    const parsedData = parseInitData(initData);
    if (!parsedData || !parsedData.user) {
      res.status(400).json({ error: 'Invalid initData format' });
      return;
    }

    const { user: telegramUser } = parsedData;

    // 4. Находим или создаем пользователя в БД
    const user = findOrCreateUser({
      tg_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      photo_url: telegramUser.photo_url,
    });

    if (!user) {
      res.status(500).json({ error: 'Failed to create or find user' });
      return;
    }

    // 5. Создаем JWT токены
    const { accessToken, refreshToken } = createTokens({
      id: user.id,
      tg_id: user.tg_id,
      roles: user.roles,
    });

    // 6. Устанавливаем токены в HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Только HTTPS в продакшене
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      path: '/',
    };

    res.cookie('ACCESS_TOKEN', accessToken, cookieOptions);
    res.cookie('REFRESH_TOKEN', refreshToken, cookieOptions);

    // 7. Возвращаем успешный ответ с данными пользователя
    res.status(200).json({
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/protected
 * Защищенный эндпоинт - проверяет авторизацию
 */
router.get('/protected', async (req: Request, res: Response) => {
  try {
    // 1. Получаем токены из cookies
    const accessToken = req.cookies?.ACCESS_TOKEN;
    const refreshToken = req.cookies?.REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      res.status(401).json({ error: 'Unauthorized - no tokens' });
      return;
    }

    // 2. Пытаемся проверить access token
    let payload = verifyAccessToken(accessToken);

    // 3. Если access token истек, пытаемся обновить через refresh token
    if (!payload) {
      const newTokens = refreshAccessToken(refreshToken);

      if (!newTokens) {
        // Refresh token тоже невалиден - нужна повторная авторизация
        res.status(401).json({ error: 'Unauthorized - tokens expired' });
        return;
      }

      // Устанавливаем новые токены в cookies
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      };

      res.cookie('ACCESS_TOKEN', newTokens.accessToken, cookieOptions);
      res.cookie('REFRESH_TOKEN', newTokens.refreshToken, cookieOptions);

      // Верифицируем новый access token чтобы получить payload
      payload = verifyAccessToken(newTokens.accessToken);
    }

    if (!payload) {
      res.status(401).json({ error: 'Unauthorized - invalid token' });
      return;
    }

    // 4. Получаем актуальные данные пользователя из БД
    const user = getUserByTgId(payload.tg_id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // 5. Возвращаем данные пользователя
    res.status(200).json({
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

