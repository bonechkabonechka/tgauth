import * as crypto from 'crypto';
import { getDatabase } from './init.js';

export interface AuthSession {
  token: string;
  user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  status: 'pending' | 'completed' | 'expired';
  created_at: number;
  expires_at: number;
  used_at: number | null;
}

/**
 * Создает новую сессию авторизации
 * @returns UUID токен и данные сессии
 */
export async function createAuthSession(): Promise<{ token: string; expiresAt: number }> {
  const db = getDatabase();
  const token = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 минут

  await db.execute({
    sql: `
      INSERT INTO auth_sessions (token, status, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [token, 'pending', now, expiresAt],
  });

  return { token, expiresAt };
}

/**
 * Получает сессию по токену
 */
export async function getAuthSession(token: string): Promise<AuthSession | null> {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM auth_sessions WHERE token = ? LIMIT 1',
      args: [token],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      token: row.token as string,
      user_id: row.user_id as string | null,
      access_token: row.access_token as string | null,
      refresh_token: row.refresh_token as string | null,
      status: row.status as 'pending' | 'completed' | 'expired',
      created_at: row.created_at as number,
      expires_at: row.expires_at as number,
      used_at: row.used_at as number | null,
    };
  } catch (error) {
    console.error('Ошибка получения сессии:', error);
    return null;
  }
}

/**
 * Обновляет сессию после успешной авторизации
 * Сохраняет JWT токены в сессии
 */
export async function completeAuthSession(
  token: string,
  userId: string,
  accessToken: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.execute({
      sql: `
        UPDATE auth_sessions 
        SET user_id = ?, access_token = ?, refresh_token = ?, status = ?
        WHERE token = ? AND status = 'pending'
      `,
      args: [userId, accessToken, refreshToken, 'completed', token],
    });

    return true;
  } catch (error) {
    console.error('Ошибка обновления сессии:', error);
    return false;
  }
}

/**
 * Помечает сессию как использованную
 */
export async function markSessionAsUsed(token: string): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.execute({
      sql: 'UPDATE auth_sessions SET used_at = ? WHERE token = ?',
      args: [Date.now(), token],
    });

    return true;
  } catch (error) {
    console.error('Ошибка пометки сессии как использованной:', error);
    return false;
  }
}

/**
 * Проверяет, истекла ли сессия
 */
export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() > session.expires_at;
}