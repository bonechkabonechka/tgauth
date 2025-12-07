import * as crypto from 'crypto';
import { getDatabase } from './init.js';

export interface User {
  id: string;
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  roles: string[];
  created_at: number;
  updated_at: number;
}

/**
 * Находит пользователя по Telegram ID
 */
export async function getUserByTgId(tgId: number): Promise<User | null> {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE tg_id = ? LIMIT 1',
      args: [tgId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      tg_id: row.tg_id as number,
      first_name: row.first_name as string,
      last_name: row.last_name as string | undefined,
      username: row.username as string | undefined,
      photo_url: row.photo_url as string | undefined,
      roles: JSON.parse((row.roles as string) || '["user"]'),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

/**
 * Создает нового пользователя
 */
export async function createUser(userData: {
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  roles?: string[];
}): Promise<User | null> {
  try {
    const db = getDatabase();
    const now = Date.now();
    const id = crypto.randomUUID();
    
    const newUser = {
      id,
      tg_id: userData.tg_id,
      first_name: userData.first_name,
      last_name: userData.last_name || null,
      username: userData.username || null,
      photo_url: userData.photo_url || null,
      roles: JSON.stringify(userData.roles || ['user']),
      created_at: now,
      updated_at: now,
    };

    await db.execute({
      sql: `
        INSERT INTO users (id, tg_id, first_name, last_name, username, photo_url, roles, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        newUser.id,
        newUser.tg_id,
        newUser.first_name,
        newUser.last_name,
        newUser.username,
        newUser.photo_url,
        newUser.roles,
        newUser.created_at,
        newUser.updated_at,
      ],
    });
    
    return {
      id: newUser.id,
      tg_id: newUser.tg_id,
      first_name: newUser.first_name,
      last_name: newUser.last_name || undefined,
      username: newUser.username || undefined,
      photo_url: newUser.photo_url || undefined,
      roles: JSON.parse(newUser.roles),
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    };
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return null;
  }
}

/**
 * Находит или создает пользователя (upsert)
 */
export async function findOrCreateUser(userData: {
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}): Promise<User | null> {
  // Пытаемся найти существующего пользователя
  let user = await getUserByTgId(userData.tg_id);

  if (user) {
    // Обновляем данные если нужно
    const updates: any = {
      updated_at: Date.now(),
    };

    if (userData.first_name !== user.first_name) updates.first_name = userData.first_name;
    if (userData.last_name !== user.last_name) updates.last_name = userData.last_name;
    if (userData.username !== user.username) updates.username = userData.username;
    if (userData.photo_url !== user.photo_url) updates.photo_url = userData.photo_url;

    if (Object.keys(updates).length > 1) {
      // Есть изменения, обновляем
      const db = getDatabase();
      const setClause = Object.keys(updates)
        .filter(key => key !== 'updated_at')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const args = [
        ...Object.keys(updates)
          .filter(key => key !== 'updated_at')
          .map(key => updates[key]),
        updates.updated_at,
        user.id,
      ];

      await db.execute({
        sql: `UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`,
        args,
      });

      user = { ...user, ...updates };
    }

    return user;
  }

  // Создаем нового пользователя
  return await createUser(userData);
}

