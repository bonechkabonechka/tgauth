import * as crypto from 'crypto';
import { getDatabase } from './init';
import type Database from 'better-sqlite3';

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
export function getUserByTgId(tgId: number): User | null {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE tg_id = ? LIMIT 1').get(tgId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      tg_id: row.tg_id,
      first_name: row.first_name,
      last_name: row.last_name || undefined,
      username: row.username || undefined,
      photo_url: row.photo_url || undefined,
      roles: JSON.parse(row.roles || '["user"]'),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

/**
 * Создает нового пользователя
 */
export function createUser(userData: {
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  roles?: string[];
}): User | null {
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

    db.prepare(`
      INSERT INTO users (id, tg_id, first_name, last_name, username, photo_url, roles, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUser.id,
      newUser.tg_id,
      newUser.first_name,
      newUser.last_name,
      newUser.username,
      newUser.photo_url,
      newUser.roles,
      newUser.created_at,
      newUser.updated_at,
    );
    
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
export function findOrCreateUser(userData: {
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}): User | null {
  // Пытаемся найти существующего пользователя
  let user = getUserByTgId(userData.tg_id);

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

      db.prepare(`UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`).run(...args);
      user = { ...user, ...updates };
    }

    return user;
  }

  // Создаем нового пользователя
  return createUser(userData);
}

