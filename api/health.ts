import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from './db/init.js';
import { initDatabase } from './db/init.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  // Настройка CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    // Проверяем переменные окружения
    const hasTursoUrl = !!process.env.TURSO_DATABASE_URL;
    const hasTursoToken = !!process.env.TURSO_AUTH_TOKEN;
    const hasBotToken = !!process.env.BOT_TOKEN;
    const hasJwtSecrets = !!(process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET);

    // Инициализируем БД
    try {
      await initDatabase();
      const db = getDatabase();
      
      // Пробуем выполнить простой запрос
      await db.execute('SELECT 1');
      
      response.status(200).json({
        status: 'ok',
        database: 'connected',
        env: {
          tursoUrl: hasTursoUrl,
          tursoToken: hasTursoToken,
          botToken: hasBotToken,
          jwtSecrets: hasJwtSecrets,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (dbError: any) {
      response.status(500).json({
        status: 'error',
        database: 'connection failed',
        error: dbError.message,
        env: {
          tursoUrl: hasTursoUrl,
          tursoToken: hasTursoToken,
          botToken: hasBotToken,
          jwtSecrets: hasJwtSecrets,
        },
      });
    }
  } catch (error: any) {
    response.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
}


