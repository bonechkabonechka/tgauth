# Архитектура Backend API - Telegram Authentication

## Структура `/api`

```
api/
├── auth/
│   ├── signin.ts              # POST /api/auth/signin - Mini App авторизация
│   ├── protected.ts           # GET /api/auth/protected - Проверка авторизации
│   ├── callback.ts            # GET /api/auth/callback - Callback после бота
│   └── browser/
│       ├── init.ts            # POST /api/auth/browser/init - Создание сессии
│       ├── verify.ts          # GET /api/auth/browser/verify - Polling статуса
│       └── complete.ts        # POST /api/auth/browser/complete - Завершение (бот)
├── db/
│   ├── init.ts                # Подключение к Turso, создание таблиц
│   ├── users.ts               # CRUD операции с пользователями
│   └── authSessions.ts        # Управление временными сессиями
├── utils/
│   ├── jwt.ts                 # JWT: создание, верификация, обновление
│   └── validateInitData.ts    # Валидация Telegram initData
└── health.ts                  # GET /api/health - Проверка системы
```

---

## База данных

### Схема таблиц

**`users`**:
```sql
id TEXT PRIMARY KEY                    -- UUID
tg_id INTEGER UNIQUE NOT NULL          -- Telegram ID (индекс)
first_name TEXT NOT NULL
last_name TEXT
username TEXT
photo_url TEXT
roles TEXT NOT NULL DEFAULT '["user"]' -- JSON массив
created_at INTEGER NOT NULL            -- Unix timestamp
updated_at INTEGER NOT NULL            -- Unix timestamp
```

**`auth_sessions`**:
```sql
token TEXT PRIMARY KEY                 -- UUID
user_id TEXT                           -- После авторизации
access_token TEXT                      -- JWT после авторизации
refresh_token TEXT                     -- JWT после авторизации
status TEXT NOT NULL DEFAULT 'pending' -- pending | completed | expired
created_at INTEGER NOT NULL
expires_at INTEGER NOT NULL            -- +5 минут от created_at
used_at INTEGER                        -- Timestamp использования
```

### Функции БД

**`api/db/init.ts`**:
- `getDatabase()` - Singleton клиент Turso
- `initDatabase()` - Создание таблиц при первом запуске

**`api/db/users.ts`**:
- `getUserByTgId(tgId)` - Поиск по Telegram ID
- `createUser(userData)` - Создание нового пользователя
- `findOrCreateUser(userData)` - Upsert: найти или создать + обновить данные

**`api/db/authSessions.ts`**:
- `createAuthSession()` - Создать сессию (UUID, expires_at = now + 5min)
- `getAuthSession(token)` - Получить сессию по токену
- `completeAuthSession(token, userId, accessToken, refreshToken)` - Сохранить токены в сессию
- `markSessionAsUsed(token)` - Пометить как использованную
- `isSessionExpired(session)` - Проверка истечения

---

## JWT токены

**`api/utils/jwt.ts`**:

**Переменные окружения**:
- `JWT_ACCESS_SECRET` - Секрет для access токенов
- `JWT_REFRESH_SECRET` - Секрет для refresh токенов

**Функции**:
- `createTokens(payload)` - Создает пару токенов:
  - Access: 5 минут жизни
  - Refresh: 7 дней жизни
  - Payload: `{ id, tg_id, roles }`
- `verifyAccessToken(token)` - Верификация access токена
- `verifyRefreshToken(token)` - Верификация refresh токена
- `refreshAccessToken(refreshToken)` - Обновление пары токенов

**Стратегия**:
- Access токен короткоживущий (5 мин) - для безопасности
- При истечении автоматически обновляется через refresh токен
- Если refresh токен истек - требуется повторная авторизация

---

## Валидация Telegram

**`api/utils/validateInitData.ts`**:

**`validateInitData(initData, botToken)`**:
1. Извлекает `hash` из параметров
2. Сортирует остальные параметры по ключу
3. Создает `dataCheckString`: `key=value\nkey2=value2\n...`
4. Генерирует секретный ключ: `HMAC-SHA256('WebAppData', botToken)`
5. Вычисляет хеш: `HMAC-SHA256(secretKey, dataCheckString)`
6. Сравнивает с полученным `hash`

**`parseInitData(initData)`**:
- Парсит URL параметры
- Извлекает `user` (JSON), `auth_date`, `hash`
- Возвращает структурированные данные

**Безопасность**: Всегда валидировать на сервере, никогда не доверять клиенту.

---

## API Endpoints

### POST /api/auth/signin

**Назначение**: Авторизация через Telegram Mini App.

**Request**:
```json
POST /api/auth/signin
Content-Type: application/json

{
  "initData": "user=%7B%22id%22%3A123%7D&hash=abc..."
}
```

**Процесс**:
1. Валидация `initData` через `validateInitData()`
2. Парсинг данных пользователя через `parseInitData()`
3. Поиск/создание пользователя через `findOrCreateUser()`
4. Создание JWT токенов через `createTokens()`
5. Установка cookies: `ACCESS_TOKEN`, `REFRESH_TOKEN`
6. Возврат данных пользователя

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "tg_id": 123456,
    "first_name": "Иван",
    "last_name": "Иванов",
    "username": "ivan",
    "photo_url": "https://...",
    "roles": ["user"]
  }
}
```

**Cookies**:
- `ACCESS_TOKEN`: HttpOnly, Secure, SameSite=Strict, Max-Age=604800
- `REFRESH_TOKEN`: HttpOnly, Secure, SameSite=Strict, Max-Age=604800

---

### GET /api/auth/protected

**Назначение**: Проверка авторизации и получение данных пользователя.

**Request**:
```
GET /api/auth/protected
Cookie: ACCESS_TOKEN=...; REFRESH_TOKEN=...
```

**Процесс**:
1. Извлечение токенов из cookies
2. Верификация access token
3. Если истек - обновление через `refreshAccessToken()`
4. Установка новых токенов в cookies (если обновлены)
5. Получение данных пользователя из БД через `getUserByTgId()`
6. Возврат данных пользователя

**Response (успех)**:
```json
{
  "success": true,
  "user": { ... }
}
```

**Response (ошибка)**:
```json
{
  "error": "Unauthorized - tokens expired"
}
```

**Использование**: Вызывается фронтендом при загрузке и для проверки авторизации.

---

### POST /api/auth/browser/init

**Назначение**: Инициализация браузерной авторизации.

**Request**:
```
POST /api/auth/browser/init
```

**Процесс**:
1. Создание сессии через `createAuthSession()`
2. Формирование ссылки: `https://t.me/BOT_USERNAME?start=auth_UUID`
3. Возврат токена и ссылки

**Response**:
```json
{
  "success": true,
  "token": "uuid-token",
  "botUrl": "https://t.me/test123452bot?start=auth_uuid-token",
  "expiresAt": 1234567890
}
```

**Использование**: Вызывается при нажатии "Войти через Telegram" в браузере.

---

### GET /api/auth/browser/verify

**Назначение**: Polling статуса браузерной авторизации.

**Request**:
```
GET /api/auth/browser/verify?token=uuid-token
```

**Процесс**:
1. Получение сессии через `getAuthSession(token)`
2. Проверка статуса:
   - `pending` - ждет авторизации
   - `completed` - возвращает токены
   - `expired` - сессия истекла
   - `not_found` - сессия не найдена

**Response (pending)**:
```json
{
  "status": "pending",
  "message": "Waiting for authorization..."
}
```

**Response (completed)**:
```json
{
  "status": "completed",
  "accessToken": "jwt-token",
  "refreshToken": "jwt-token"
}
```

**Использование**: Polling каждые 2 секунды до получения `completed` или `expired`.

---

### POST /api/auth/browser/complete

**Назначение**: Завершение авторизации (вызывается ботом).

**Request**:
```json
POST /api/auth/browser/complete
Content-Type: application/json

{
  "token": "uuid-token",
  "user": {
    "tg_id": 123456,
    "first_name": "Иван",
    "last_name": "Иванов",
    "username": "ivan",
    "photo_url": "https://..."
  }
}
```

**Процесс**:
1. Проверка наличия токена и данных пользователя
2. Получение сессии через `getAuthSession(token)`
3. Проверка статуса (должен быть `pending`)
4. Проверка истечения через `isSessionExpired()`
5. Поиск/создание пользователя через `findOrCreateUser()`
6. Создание JWT токенов через `createTokens()`
7. Сохранение токенов в сессию через `completeAuthSession()`
8. Возврат callback URL

**Response**:
```json
{
  "success": true,
  "callbackUrl": "https://tgauth2.vercel.app/api/auth/callback?token=uuid-token",
  "message": "Авторизация успешна! Нажмите кнопку чтобы вернуться на сайт."
}
```

**Использование**: Вызывается Telegram ботом после `/start auth_UUID`.

---

### GET /api/auth/callback

**Назначение**: Callback после авторизации в боте (установка cookies).

**Request**:
```
GET /api/auth/callback?token=uuid-token
```

**Процесс**:
1. Получение токена из query параметров
2. Получение сессии через `getAuthSession(token)`
3. Проверка статуса (должен быть `completed`)
4. Извлечение JWT токенов из сессии
5. Установка токенов в HTTP-only cookies
6. Пометка сессии как использованной через `markSessionAsUsed()`
7. Редирект на `/`

**Использование**: Вызывается при нажатии кнопки в боте, устанавливает cookies и редиректит.

---

## Взаимодействие Frontend ↔ Backend

### Frontend структура

```
src/
├── components/
│   ├── AuthProvider.tsx      # Context провайдер
│   ├── MiniAppAuth.tsx       # Автоматическая авторизация Mini App
│   ├── BrowserAuth.tsx        # Браузерная авторизация
│   └── UserProfile.tsx        # Профиль пользователя
├── hooks/
│   └── useAuth.ts            # Хук авторизации
└── config/
    └── api.ts                # API URL конфигурация
```

### useAuth hook

**Функции**:
- `signIn(initData)` - POST /api/auth/signin
- `checkAuth()` - GET /api/auth/protected (вызывается при загрузке)
- `signOut()` - Сброс состояния

**Состояние**:
```typescript
{
  user: User | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  error: string | null
}
```

### MiniAppAuth компонент

**Процесс**:
1. При монтировании проверяет `window.Telegram?.WebApp`
2. Если есть - получает `initData` и вызывает `signIn(initData)`
3. Если нет - вызывает `checkAuth()` для проверки существующей авторизации

### BrowserAuth компонент

**Процесс инициализации**:
1. Пользователь нажимает "Войти через Telegram"
2. Вызывает POST /api/auth/browser/init
3. Открывает `botUrl` в новой вкладке
4. Начинает polling через GET /api/auth/browser/verify каждые 2 секунды

**Процесс polling**:
- Продолжается до получения `completed` или `expired`
- При `completed` - останавливает polling и вызывает `checkAuth()`
- При `expired` - показывает ошибку

**Процесс callback**:
- Проверяет наличие `token` в URL (после возврата с бота)
- Вызывает `checkAuth()` для проверки авторизации

---

## Потоки авторизации

### Поток 1: Mini App

```
Telegram Mini App
  ↓ initData
Frontend: MiniAppAuth
  ↓ POST /api/auth/signin
Backend: validateInitData()
  ↓ parseInitData()
Backend: findOrCreateUser()
  ↓ createTokens()
Backend: Set-Cookie
  ↓ Response: { user }
Frontend: обновление состояния
  ↓
Пользователь авторизован
```

### Поток 2: Browser

```
Браузер
  ↓ POST /api/auth/browser/init
Backend: createAuthSession()
  ↓ Response: { token, botUrl }
Frontend: открытие botUrl
  ↓
Telegram Bot: /start auth_UUID
  ↓ POST /api/auth/browser/complete
Backend: findOrCreateUser() + createTokens()
  ↓ completeAuthSession()
Backend: Response: { callbackUrl }
Bot: кнопка с callbackUrl
  ↓
GET /api/auth/callback?token=...
Backend: Set-Cookie + redirect(/)
  ↓
Frontend: checkAuth()
  ↓ GET /api/auth/protected
Backend: verifyAccessToken() + getUserByTgId()
  ↓ Response: { user }
Frontend: обновление состояния
  ↓
Пользователь авторизован
```

**Polling (параллельно)**:
```
Frontend: каждые 2 сек
  ↓ GET /api/auth/browser/verify?token=...
Backend: getAuthSession()
  ↓ Response: { status }
Frontend: если 'completed' → checkAuth()
```

---

## Миграция на FastAPI + PostgreSQL

### Структура проекта

```
backend/
├── app/
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Конфигурация
│   ├── database.py             # PostgreSQL подключение
│   ├── models/                 # SQLAlchemy модели
│   │   ├── user.py
│   │   └── auth_session.py
│   ├── schemas/                # Pydantic схемы
│   │   ├── user.py
│   │   └── auth.py
│   ├── routers/                # API endpoints
│   │   ├── auth.py
│   │   └── health.py
│   ├── services/               # Бизнес-логика
│   │   ├── user_service.py
│   │   ├── auth_session_service.py
│   │   ├── jwt_service.py
│   │   └── telegram_service.py
│   └── utils/
│       └── telegram.py
├── alembic/                    # Миграции
└── requirements.txt
```

### Маппинг компонентов

#### База данных

**Текущий (Turso)**:
```typescript
const client = createClient({ url, authToken });
await db.execute({ sql: 'SELECT * FROM users WHERE tg_id = ?', args: [tgId] });
```

**FastAPI (PostgreSQL)**:
```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# models/user.py
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    tg_id = Column(BigInteger, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=False)
    # ...

# services/user_service.py
async def get_user_by_tg_id(tg_id: int) -> User | None:
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.tg_id == tg_id)
        )
        return result.scalar_one_or_none()
```

#### JWT токены

**Текущий**:
```typescript
jwt.sign(payload, secret, { expiresIn: '5m' });
```

**FastAPI**:
```python
# services/jwt_service.py
import jwt
from datetime import datetime, timedelta

def create_tokens(payload: dict) -> dict:
    access_token = jwt.encode(
        {**payload, "exp": datetime.utcnow() + timedelta(minutes=5)},
        ACCESS_SECRET,
        algorithm="HS256"
    )
    refresh_token = jwt.encode(
        {**payload, "exp": datetime.utcnow() + timedelta(days=7)},
        REFRESH_SECRET,
        algorithm="HS256"
    )
    return {"accessToken": access_token, "refreshToken": refresh_token}
```

#### Валидация Telegram

**Текущий**:
```typescript
const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
```

**FastAPI**:
```python
# utils/telegram.py
import hmac
import hashlib
from urllib.parse import parse_qs

def validate_init_data(init_data: str, bot_token: str) -> bool:
    parsed = parse_qs(init_data)
    hash_value = parsed.get('hash', [None])[0]
    if not hash_value:
        return False
    
    data_check_string = '\n'.join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items()) if k != 'hash'
    )
    
    secret_key = hmac.new(
        'WebAppData'.encode(),
        bot_token.encode(),
        hashlib.sha256
    ).digest()
    
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == hash_value
```

#### Endpoints

**Текущий**:
```typescript
export default async function handler(request: VercelRequest, response: VercelResponse) {
  // ...
}
```

**FastAPI**:
```python
# routers/auth.py
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signin")
async def signin(request: Request, response: Response):
    body = await request.json()
    init_data = body.get("initData")
    
    if not validate_init_data(init_data, BOT_TOKEN):
        return JSONResponse({"error": "Invalid initData"}, status_code=401)
    
    user_data = parse_init_data(init_data)
    user = await find_or_create_user(user_data)
    tokens = create_tokens({"id": user.id, "tg_id": user.tg_id, "roles": user.roles})
    
    response.set_cookie(
        "ACCESS_TOKEN", tokens["accessToken"],
        httponly=True, secure=True, samesite="strict", max_age=7*24*60*60
    )
    response.set_cookie(
        "REFRESH_TOKEN", tokens["refreshToken"],
        httponly=True, secure=True, samesite="strict", max_age=7*24*60*60
    )
    
    return JSONResponse({"success": True, "user": {...}})
```

### Ключевые отличия

1. **Асинхронность**: Все БД операции через `async/await`
2. **ORM**: SQLAlchemy вместо raw SQL
3. **Валидация**: Pydantic схемы вместо ручной проверки
4. **Cookies**: `response.set_cookie()` вместо `setHeader('Set-Cookie')`
5. **CORS**: Middleware вместо ручной установки заголовков

### Миграция БД

**Alembic миграция**:
```python
# alembic/versions/001_initial.py
def upgrade():
    op.create_table('users', ...)
    op.create_index('idx_users_tg_id', 'users', ['tg_id'])
    op.create_table('auth_sessions', ...)
```

### Деплой

**Варианты**:
- Vercel (serverless functions)
- Railway/Render (Git деплой)
- Docker (контейнеризация)
- AWS/GCP/Azure (облако)

---

## Переменные окружения

**Текущие**:
- `TURSO_DATABASE_URL` - URL базы Turso
- `TURSO_AUTH_TOKEN` - Токен Turso
- `BOT_TOKEN` - Токен Telegram бота
- `JWT_ACCESS_SECRET` - Секрет для access токенов
- `JWT_REFRESH_SECRET` - Секрет для refresh токенов

**Для FastAPI + PostgreSQL**:
- `DATABASE_URL` - PostgreSQL connection string
- `BOT_TOKEN` - Токен Telegram бота
- `JWT_ACCESS_SECRET` - Секрет для access токенов
- `JWT_REFRESH_SECRET` - Секрет для refresh токенов

---

## Чеклист миграции

- [ ] Создать структуру FastAPI проекта
- [ ] Настроить PostgreSQL подключение
- [ ] Создать SQLAlchemy модели (User, AuthSession)
- [ ] Написать Alembic миграции
- [ ] Реализовать сервисы (user, auth_session, jwt, telegram)
- [ ] Создать эндпоинты (signin, protected, browser/*, callback)
- [ ] Настроить CORS middleware
- [ ] Протестировать все эндпоинты
- [ ] Обновить переменные окружения
- [ ] Задеплоить
- [ ] Обновить фронтенд (если нужно изменить URL)
