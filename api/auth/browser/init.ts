import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAuthSession } from '../../db/authSessions.js';
import { initDatabase } from '../../db/init.js';

const BOT_USERNAME = 'test123452bot'; // Имя вашего бота
const SITE_URL = 'https://tgauth2.vercel.app'; // URL вашего сайта

/**
 * POST /api/auth/browser/init
 * Создает UUID токен и возвращает ссылку на бота для авторизации
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
    // Создаем новую сессию авторизации
    const { token, expiresAt } = await createAuthSession();

    // Формируем ссылку на бота
    const botUrl = `https://t.me/${BOT_USERNAME}?start=auth_${token}`;

    // Возвращаем ссылку и токен для проверки статуса
    response.status(200).json({
      success: true,
      token, // UUID токен для проверки статуса
      botUrl, // Ссылка на бота
      expiresAt, // Время истечения (timestamp)
    });
  } catch (error) {
    console.error('Error in browser auth init:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}