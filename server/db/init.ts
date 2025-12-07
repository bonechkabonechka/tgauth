import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Путь к файлу базы данных
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.db');

// Создаем директорию для БД если её нет
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Глобальный экземпляр БД
let db: Database.Database | null = null;

/**
 * Получает экземпляр базы данных (singleton)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Включаем foreign keys
    db.pragma('foreign_keys = ON');
    
    // Инициализируем схему
    initSchema(db);
  }

  return db;
}

/**
 * Инициализирует схему базы данных
 */
function initSchema(database: Database.Database): void {
  // Создаем таблицу users
  database.exec(`
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
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_tg_id ON users(tg_id)
  `);
}

/**
 * Закрывает соединение с БД (для graceful shutdown)
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

