# ⚡ Быстрый деплой на 194.87.102.27

## Команды для копирования

```bash
# 1. Подключитесь к серверу
ssh root@194.87.102.27

# 2. Установите Docker (один раз)
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 3. Клонируйте проект
cd /opt
git clone https://github.com/bonechkabonechka/tgauth.git
cd tgauth

# 4. Создайте .env файл
nano .env
# Вставьте содержимое (см. ниже) и сохраните: Ctrl+O, Enter, Ctrl+X

# 5. Создайте директории
mkdir -p data logs nginx/ssl

# 6. Соберите и запустите
docker compose build
docker compose up -d

# 7. Проверьте
docker compose ps
curl http://localhost:3000/health
```

## Содержимое .env файла

```env
NODE_ENV=production
PORT=3000
BOT_TOKEN=your-bot-token-here
JWT_ACCESS_SECRET=your-access-secret-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
DB_PATH=/app/data/database.db
ALLOWED_ORIGIN=*
```

**⚠️ Замените:**
- `your-bot-token-here` на токен от @BotFather
- `your-access-secret-min-64-chars` на случайную строку 64+ символов
- `your-refresh-secret-min-64-chars` на другую случайную строку 64+ символов

## Проверка работы

```bash
# Логи
docker compose logs -f app

# Статус
docker compose ps

# Health check
curl http://localhost:3000/health
```

Откройте в браузере: **http://194.87.102.27**

---

**Подробная инструкция:** [DEPLOY_FROM_GITHUB.md](./DEPLOY_FROM_GITHUB.md)

