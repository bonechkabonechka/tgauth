# Многостадийная сборка для оптимизации размера образа

# Стадия 1: Сборка frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники frontend и собираем
COPY . .
RUN npm run build:client

# Стадия 2: Сборка backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники backend и собираем
COPY server ./server
COPY tsconfig.server.json ./
RUN npm run build:server

# Стадия 3: Production образ
FROM node:20-alpine

WORKDIR /app

# Устанавливаем только production зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем собранные файлы из предыдущих стадий
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/dist-server ./dist-server

# Создаем директорию для БД
RUN mkdir -p /app/data && chmod 755 /app/data

# Открываем порт
EXPOSE 3000

# Переменные окружения (можно переопределить через docker-compose)
ENV NODE_ENV=production
ENV PORT=3000

# Запускаем приложение
CMD ["node", "dist-server/index.js"]

