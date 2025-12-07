# Инструкция по деплою Frontend и Backend

## 🎯 Варианты деплоя

У вас есть **два варианта**:

### Вариант 1: Все на Vercel (рекомендуется) ✅

**Преимущества:**
- Все в одном месте (frontend + backend)
- Проще управлять
- Один деплой командой
- Бесплатный tier достаточен для большинства проектов

**Деплой:**
```bash
cd C:\ts\ton\ton9\ton10
npm run build
vercel --prod
```

### Вариант 2: Frontend на Firebase, Backend на Vercel

**Преимущества:**
- Firebase Hosting бесплатный (не требует Blaze план)
- Backend на Vercel (не требует платный план Firebase)

**Деплой:**

1. **Backend на Vercel:**
```bash
cd C:\ts\ton\ton9\ton10
vercel --prod
```

2. **Frontend на Firebase:**
```bash
cd C:\ts\ton\ton9\ton10
npm run build
firebase deploy --only hosting
```

3. **Обновить API URL:**
   - В Firebase Hosting нет API routes
   - Нужно указать URL Vercel API в переменных окружения или в коде
   - Обновите `src/config/api.ts` или используйте `VITE_API_URL`

---

## 📋 Подробная инструкция для каждого варианта

## Вариант 1: Все на Vercel

### Шаг 1: Установка зависимостей
```bash
cd C:\ts\ton\ton9\ton10
npm install
```

### Шаг 2: Настройка переменных окружения
Создайте `.env.local` (см. `INSTRUCTIONS.md`)

### Шаг 3: Деплой
```bash
# Войдите в Vercel (если еще не вошли)
vercel login

# Задеплойте проект
vercel --prod
```

### Шаг 4: Настройка переменных окружения в Vercel
1. Откройте Vercel Dashboard
2. Settings → Environment Variables
3. Добавьте все переменные из `.env.local`

### Шаг 5: Обновить URL Mini App в Telegram
1. Откройте @BotFather
2. `/mybots` → выберите бота → "Bot Settings" → "Menu Button"
3. Укажите URL: `https://your-project.vercel.app`

**Готово!** Frontend и Backend работают на одном домене.

---

## Вариант 2: Frontend на Firebase, Backend на Vercel

### Шаг 1: Деплой Backend на Vercel

```bash
cd C:\ts\ton\ton9\ton10
vercel login
vercel --prod
```

Запишите URL вашего Vercel проекта (например: `https://ton10-api.vercel.app`)

### Шаг 2: Настройка переменных окружения в Vercel
Добавьте все переменные в Vercel Dashboard (см. Вариант 1, Шаг 4)

### Шаг 3: Обновить API URL для Firebase

**Вариант 3.1: Через переменную окружения**

Создайте файл `.env.production`:
```env
VITE_API_URL=https://your-vercel-api.vercel.app/api
```

**Вариант 3.2: Через код**

Обновите `src/config/api.ts`:
```typescript
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Для Firebase Hosting указываем полный URL Vercel API
  if (import.meta.env.PROD) {
    return 'https://your-vercel-api.vercel.app/api';
  }
  
  return '/api';
};
```

### Шаг 4: Сборка и деплой Frontend на Firebase

```bash
cd C:\ts\ton\ton9\ton10

# Собрать frontend
npm run build

# Задеплоить на Firebase Hosting
firebase deploy --only hosting
```

### Шаг 5: Обновить URL Mini App в Telegram
1. Откройте @BotFather
2. `/mybots` → выберите бота → "Bot Settings" → "Menu Button"
3. Укажите URL: `https://your-project.firebaseapp.com` (или ваш кастомный домен)

**Готово!** Frontend на Firebase, Backend на Vercel.

---

## 🔍 Проверка работы

### Проверка API (Backend)
```bash
# Проверка signin endpoint
curl -X POST https://your-vercel-api.vercel.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"initData":"test"}'
```

### Проверка Frontend
1. Откройте URL вашего frontend
2. Откройте DevTools → Network
3. Проверьте что запросы к API идут правильно

---

## ⚠️ Важные замечания

### CORS при раздельном деплое

Если frontend на Firebase, а backend на Vercel, нужно настроить CORS:

В `api/auth/signin.ts` и `api/auth/protected.ts` обновите CORS headers:

```typescript
// Замените origin: '*' на конкретный домен
response.setHeader('Access-Control-Allow-Origin', 'https://your-firebase-app.firebaseapp.com');
```

Или используйте переменную окружения:
```typescript
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
```

### Cookies при раздельном деплое

Если frontend и backend на разных доменах:
- Cookies с `SameSite=Strict` могут не работать
- Используйте `SameSite=None` и `Secure=true`
- Или используйте другой способ хранения токенов (localStorage + заголовок Authorization)

---

## 🎯 Рекомендация

**Используйте Вариант 1 (все на Vercel)** потому что:
- ✅ Проще управлять
- ✅ Один домен = нет проблем с CORS и cookies
- ✅ Один деплой
- ✅ Бесплатный tier достаточен

**Используйте Вариант 2** если:
- У вас уже есть Firebase проект
- Хотите использовать Firebase Hosting (бесплатный, не требует Blaze)
- Нужны специфические возможности Firebase

---

## 📝 Быстрая команда для деплоя

### Вариант 1 (Vercel):
```bash
cd C:\ts\ton\ton9\ton10 && npm run build && vercel --prod
```

### Вариант 2 (Firebase + Vercel):
```bash
# Backend
cd C:\ts\ton\ton9\ton10 && vercel --prod

# Frontend
cd C:\ts\ton\ton9\ton10 && npm run build && firebase deploy --only hosting
```

