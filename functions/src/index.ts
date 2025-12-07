import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import * as cookie from 'cookie';  // ← Используем cookie вместо cookie-parser
import { initDatabase } from './db/users';
import { signin } from './auth/signin';
import { protectedEndpoint } from './auth/protected';

// Инициализируем Firebase Admin
admin.initializeApp();

// Инициализируем Firestore
const db = admin.firestore();
initDatabase(db);

// Настройка CORS
const corsHandler = cors({ origin: true });

// Функция для парсинга cookies
function parseCookies(request: functions.https.Request): Record<string, string> {
  const cookieHeader = request.headers.cookie || '';
  return cookie.parse(cookieHeader);
}

// Экспортируем функцию API
export const api = functions.https.onRequest((request, response) => {
  // Парсим cookies и добавляем в request
  const cookies = parseCookies(request);
  (request as any).cookies = cookies;  // Добавляем cookies в request

  // Обрабатываем CORS
  corsHandler(request, response, () => {
    const path = request.path;
    const method = request.method;

    // Маршрутизация (проверяем оба варианта пути)
    if ((path === '/api/auth/signin' || path.endsWith('/auth/signin')) && method === 'POST') {
      signin(request, response);
      return;
    }

    if ((path === '/api/auth/protected' || path.endsWith('/auth/protected')) && method === 'GET') {
      protectedEndpoint(request, response);
      return;
    }

    // 404 для неизвестных маршрутов
    response.status(404).json({ error: 'Not found' });
  });
});