# Telegram Mini App Authentication

Telegram Mini App с JWT авторизацией, SQLite базой данных (Turso) и Vercel деплоем.

## 🚀 Быстрый старт

### Деплой на Vercel

Следуйте инструкции: **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)**

### Локальная разработка

```bash
# Установите зависимости
npm install

# Установите Vercel CLI
npm i -g vercel

# Запустите dev сервер
vercel dev

# Frontend и API: http://localhost:3000
```

## 📁 Структура проекта

```
tgauth/
├── api/                # Vercel API Routes
│   ├── auth/          # API endpoints
│   │   ├── signin.ts  # POST /api/auth/signin
│   │   └── protected.ts # GET /api/auth/protected
│   ├── db/            # Turso (SQLite) база данных
│   │   ├── init.ts    # Инициализация БД
│   │   └── users.ts   # Работа с пользователями
│   └── utils/         # Утилиты
│       ├── jwt.ts     # JWT токены
│       └── validateInitData.ts # Валидация Telegram
├── src/               # React frontend
├── vercel.json        # Конфигурация Vercel
└── package.json       # Зависимости
```

## 🔧 Настройка

### Переменные окружения

В Vercel Dashboard → Settings → Environment Variables:

```env
TURSO_DATABASE_URL=libsql://your-db-name-xxx.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
BOT_TOKEN=your-bot-token-from-botfather
JWT_ACCESS_SECRET=your-access-secret-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
```

Для локальной разработки создайте `.env.local` с теми же переменными.

## 📚 Документация

- **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)** - Деплой на Vercel с GitHub
- **[INSTRUCTIONS.md](./INSTRUCTIONS.md)** - Подробная инструкция по настройке

## 🛠️ Технологии

- **Frontend:** React + TypeScript + Vite
- **Backend:** Vercel Serverless Functions (Node.js)
- **База данных:** Turso (распределенный SQLite)
- **Авторизация:** JWT (access + refresh tokens)
- **Деплой:** Vercel

## 📝 API Endpoints

- `POST /api/auth/signin` - Авторизация через Telegram Mini App
- `GET /api/auth/protected` - Защищенный endpoint (проверка токенов)

## 🔒 Безопасность

- HTTP-only cookies для токенов
- Валидация Telegram initData
- JWT токены с коротким временем жизни
- CORS настройки
- Turso с индексами для производительности

## 📦 Деплой

### Через GitHub (рекомендуется)

1. Запушьте код в GitHub
2. Импортируйте проект в Vercel
3. Настройте переменные окружения
4. Задеплойте

Подробнее: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

### Через Vercel CLI

```bash
vercel login
vercel --prod
```

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте логи в Vercel Dashboard → Functions → Logs
2. Проверьте переменные окружения
3. Проверьте что Turso база создана и токены правильные
4. См. раздел "Решение проблем" в [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

## 📄 Лицензия

MIT
