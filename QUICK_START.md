# 🚀 Быстрый старт - Деплой на 194.87.102.27

## Шаг 1: Подготовка сервера (выполните один раз)

```bash
# Подключитесь к серверу
ssh root@194.87.102.27

# Установите Docker
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Проверьте
docker --version
```

## Шаг 2: Загрузите проект на сервер

**Вариант A: Через Git (если проект в репозитории)**
```bash
cd /opt
git clone https://github.com/your-username/ton10.git
cd ton10
```

**Вариант B: Через SCP (с вашего компьютера)**
```bash
# На вашем компьютере
cd C:\ts\ton\ton9\ton10
tar -czf ton10.tar.gz --exclude='node_modules' --exclude='dist' --exclude='dist-server' --exclude='data' --exclude='.git' .
scp ton10.tar.gz root@194.87.102.27:/opt/

# На сервере
cd /opt
mkdir ton10 && cd ton10
tar -xzf ../ton10.tar.gz
```

## Шаг 3: Настройте переменные окружения

```bash
cd /opt/ton10
mkdir -p data logs nginx/ssl

# Создайте .env файл
nano .env
```

Добавьте в `.env`:
```env
NODE_ENV=production
PORT=3000
BOT_TOKEN=your-bot-token-here
JWT_ACCESS_SECRET=your-access-secret-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
DB_PATH=/app/data/database.db
ALLOWED_ORIGIN=*
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

## Шаг 4: Запустите Docker

```bash
cd /opt/ton10

# Соберите образы
docker compose build

# Запустите контейнеры
docker compose up -d

# Проверьте статус
docker compose ps

# Проверьте логи
docker compose logs -f app
```

## Шаг 5: Проверьте работу

```bash
# Проверьте health endpoint
curl http://localhost:3000/health

# Откройте в браузере
# http://194.87.102.27
```

## ✅ Готово!

Ваш проект должен работать на `http://194.87.102.27`

---

## 🔄 Обновление проекта

```bash
cd /opt/ton10
git pull  # или загрузите новый код
docker compose build
docker compose up -d
```

## 📊 Полезные команды

```bash
# Логи
docker compose logs -f app

# Перезапуск
docker compose restart

# Остановка
docker compose down

# Статус
docker compose ps
```

---

**Подробная инструкция:** См. `DOCKER_DEPLOY.md`

