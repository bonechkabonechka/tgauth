# Telegram Mini App Authentication

Telegram Mini App с JWT авторизацией, SQLite базой данных и Express сервером.

## 🚀 Быстрый старт

### Деплой на сервер

Следуйте инструкции: **[DEPLOY_FROM_GITHUB.md](./DEPLOY_FROM_GITHUB.md)**

### Локальная разработка

```bash
# Установите зависимости
npm install

# Запустите frontend и backend одновременно
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

## 📁 Структура проекта

```
tgauth/
├── server/              # Express backend
│   ├── index.ts        # Главный файл сервера
│   ├── routes/         # API routes
│   ├── db/             # SQLite база данных
│   └── utils/          # Утилиты (JWT, валидация)
├── src/                # React frontend
├── api/                # Vercel API routes (альтернатива)
├── nginx/              # Nginx конфигурация
├── Dockerfile          # Docker образ
├── docker-compose.yml  # Docker Compose конфигурация
└── .env                # Переменные окружения (создайте сами)
```

## 🔧 Настройка

### Переменные окружения

Создайте файл `.env`:

```env
NODE_ENV=production
PORT=3000
BOT_TOKEN=your-bot-token-from-botfather
JWT_ACCESS_SECRET=your-access-secret-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
DB_PATH=/app/data/database.db
ALLOWED_ORIGIN=*
```

## 📚 Документация

- **[DEPLOY_FROM_GITHUB.md](./DEPLOY_FROM_GITHUB.md)** - Деплой с GitHub на сервер
- **[DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)** - Подробная инструкция по Docker
- **[SERVER_DEPLOY.md](./SERVER_DEPLOY.md)** - Деплой без Docker
- **[QUICK_START.md](./QUICK_START.md)** - Быстрый старт

## 🛠️ Технологии

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express + TypeScript
- **База данных:** SQLite (better-sqlite3)
- **Авторизация:** JWT (access + refresh tokens)
- **Деплой:** Docker + Docker Compose + Nginx

## 📝 API Endpoints

- `POST /api/auth/signin` - Авторизация через Telegram Mini App
- `GET /api/auth/protected` - Защищенный endpoint (проверка токенов)
- `GET /health` - Health check

## 🔒 Безопасность

- HTTP-only cookies для токенов
- Валидация Telegram initData
- JWT токены с коротким временем жизни
- CORS настройки
- SQLite с индексами для производительности

## 📦 Деплой

### Docker (рекомендуется)

```bash
docker compose build
docker compose up -d
```

### Без Docker

См. [SERVER_DEPLOY.md](./SERVER_DEPLOY.md)

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker compose logs -f app`
2. Проверьте `.env` файл
3. Проверьте статус: `docker compose ps`
4. См. раздел "Решение проблем" в [DEPLOY_FROM_GITHUB.md](./DEPLOY_FROM_GITHUB.md)

## 📄 Лицензия

MIT
