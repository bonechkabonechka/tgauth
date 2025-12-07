import { createClient } from '@libsql/client';

// Инициализация клиента Turso (libSQL)
let client: ReturnType<typeof createClient> | null = null;

export function getDatabase() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL и TURSO_AUTH_TOKEN должны быть установлены в переменных окружения');
    }

    client = createClient({
      url,
      authToken,
    });
  }

  return client;
}

/**
 * Инициализирует базу данных - создает таблицу users если её нет
 */
export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tg_id INTEGER UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      photo_url TEXT,
      roles TEXT NOT NULL DEFAULT '["user"]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Создаем индекс для быстрого поиска по tg_id
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_tg_id ON users(tg_id)
  `);

  // НОВАЯ ТАБЛИЦА: auth_sessions для временных токенов браузерной авторизации
  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    )
  `);

  // Индекс для быстрого поиска по статусу и времени истечения
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_status_expires 
    ON auth_sessions(status, expires_at)
  `);
}
