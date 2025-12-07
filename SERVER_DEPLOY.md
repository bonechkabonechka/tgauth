# Инструкция по деплою на свой сервер

## 🎯 Преимущества своего сервера

- ✅ Полный контроль над окружением
- ✅ Обычный SQLite файл (не нужен Turso)
- ✅ Нет проблем с CORS/cookies (один домен)
- ✅ Проще деплой и отладка
- ✅ Нет ограничений serverless
- ✅ Можно использовать любой VPS (DigitalOcean, Hetzner, AWS EC2, и т.д.)

## 📋 Что нужно

1. **VPS сервер** (Ubuntu 20.04+ рекомендуется)
   - Минимум: 1 CPU, 1GB RAM, 10GB SSD
   - Рекомендуется: 2 CPU, 2GB RAM, 20GB SSD
   - Популярные провайдеры:
     - [DigitalOcean](https://www.digitalocean.com/) - от $6/месяц
     - [Hetzner](https://www.hetzner.com/) - от €4/месяц
     - [Vultr](https://www.vultr.com/) - от $6/месяц
     - [AWS EC2](https://aws.amazon.com/ec2/) - pay-as-you-go

2. **Домен** (опционально, но рекомендуется)
   - Можно использовать бесплатный от [Freenom](https://www.freenom.com/) или купить на [Namecheap](https://www.namecheap.com/)

3. **Node.js 20+** на сервере

## 🚀 Шаг 1: Подготовка сервера

### 1.1. Подключитесь к серверу

```bash
ssh root@your-server-ip
```

### 1.2. Обновите систему

```bash
apt update && apt upgrade -y
```

### 1.3. Установите Node.js 20

```bash
# Установите NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Установите Node.js
apt install -y nodejs

# Проверьте версию
node --version  # Должно быть v20.x.x
npm --version
```

### 1.4. Установите PM2 (менеджер процессов)

```bash
npm install -g pm2
```

### 1.5. Установите Nginx (для reverse proxy и SSL)

```bash
apt install -y nginx
```

## 📦 Шаг 2: Подготовка проекта

### 2.1. На локальной машине соберите проект

```bash
cd C:\ts\ton\ton9\ton10
npm install
npm run build
```

### 2.2. Создайте архив для загрузки на сервер

**Вариант A: Через Git (рекомендуется)**

```bash
# Инициализируйте git если еще не сделали
git init
git add .
git commit -m "Initial commit"

# Запушьте на GitHub/GitLab
git remote add origin https://github.com/your-username/ton10.git
git push -u origin main
```

**Вариант B: Через SCP**

```bash
# Создайте архив (исключая node_modules и dist)
tar -czf ton10.tar.gz --exclude='node_modules' --exclude='dist' --exclude='dist-server' --exclude='.git' .

# Загрузите на сервер
scp ton10.tar.gz root@your-server-ip:/root/
```

## 🔧 Шаг 3: Настройка на сервере

### 3.1. Клонируйте проект (если использовали Git)

```bash
cd /var/www
git clone https://github.com/your-username/ton10.git
cd ton10
```

Или распакуйте архив:

```bash
cd /var/www
mkdir ton10
cd ton10
tar -xzf /root/ton10.tar.gz
```

### 3.2. Установите зависимости

```bash
npm install --production
```

### 3.3. Создайте файл `.env`

```bash
nano .env
```

Добавьте:

```env
NODE_ENV=production
PORT=3000

# Telegram Bot Token
BOT_TOKEN=your-bot-token-from-botfather

# JWT Secrets (сгенерируйте случайные строки минимум 64 символа)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-64-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-64-chars

# Путь к БД (по умолчанию: data/database.db)
DB_PATH=/var/www/ton10/data/database.db

# CORS (укажите ваш домен или * для всех)
ALLOWED_ORIGIN=*
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.4. Соберите проект на сервере

```bash
npm run build
```

### 3.5. Создайте директорию для БД

```bash
mkdir -p data
chmod 755 data
```

## 🚀 Шаг 4: Запуск с PM2

### 4.1. Создайте PM2 конфигурацию

```bash
nano ecosystem.config.js
```

Добавьте:

```javascript
module.exports = {
  apps: [{
    name: 'ton10',
    script: './dist-server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

### 4.2. Запустите приложение

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4.3. Проверьте статус

```bash
pm2 status
pm2 logs ton10
```

## 🌐 Шаг 5: Настройка Nginx

### 5.1. Создайте конфигурацию Nginx

```bash
nano /etc/nginx/sites-available/ton10
```

Добавьте (замените `your-domain.com` на ваш домен или IP):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Если используете IP вместо домена:
    # server_name _;

    # Логи
    access_log /var/log/nginx/ton10-access.log;
    error_log /var/log/nginx/ton10-error.log;

    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;

    # Проксирование на Node.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы (опционально, можно отдавать через Express)
    location /assets/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2. Активируйте конфигурацию

```bash
ln -s /etc/nginx/sites-available/ton10 /etc/nginx/sites-enabled/
nginx -t  # Проверка конфигурации
systemctl reload nginx
```

## 🔒 Шаг 6: Настройка SSL (Let's Encrypt)

### 6.1. Установите Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2. Получите SSL сертификат

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Следуйте инструкциям. Certbot автоматически обновит конфигурацию Nginx.

### 6.3. Автоматическое обновление сертификата

```bash
certbot renew --dry-run
```

## ✅ Шаг 7: Проверка работы

### 7.1. Проверьте API

```bash
curl http://localhost:3000/health
# Должно вернуть: {"status":"ok","timestamp":"..."}
```

### 7.2. Проверьте через браузер

Откройте `http://your-domain.com` или `http://your-server-ip`

### 7.3. Проверьте логи

```bash
pm2 logs ton10
tail -f /var/log/nginx/ton10-access.log
```

## 🔄 Шаг 8: Обновление приложения

### 8.1. Обновите код

```bash
cd /var/www/ton10
git pull  # Если используете Git
# Или загрузите новый архив через SCP
```

### 8.2. Пересоберите и перезапустите

```bash
npm install
npm run build
pm2 restart ton10
```

## 📊 Мониторинг

### Просмотр логов PM2

```bash
pm2 logs ton10        # Все логи
pm2 logs ton10 --err   # Только ошибки
pm2 logs ton10 --out   # Только вывод
```

### Мониторинг ресурсов

```bash
pm2 monit
```

### Статус приложения

```bash
pm2 status
pm2 info ton10
```

## 🗄️ Резервное копирование БД

### Создайте скрипт бэкапа

```bash
nano /root/backup-db.sh
```

Добавьте:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DB_PATH="/var/www/ton10/data/database.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH "$BACKUP_DIR/database_$DATE.db"

# Удалите старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "database_*.db" -mtime +7 -delete

echo "Backup created: database_$DATE.db"
```

Сделайте исполняемым:

```bash
chmod +x /root/backup-db.sh
```

### Настройте cron для автоматического бэкапа

```bash
crontab -e
```

Добавьте (бэкап каждый день в 3:00):

```
0 3 * * * /root/backup-db.sh
```

## 🔧 Полезные команды

```bash
# Перезапуск приложения
pm2 restart ton10

# Остановка
pm2 stop ton10

# Запуск
pm2 start ton10

# Удаление из PM2
pm2 delete ton10

# Перезагрузка Nginx
systemctl reload nginx

# Проверка статуса Nginx
systemctl status nginx

# Просмотр логов Nginx
tail -f /var/log/nginx/ton10-error.log
```

## ⚠️ Безопасность

1. **Firewall (UFW)**

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable
```

2. **Обновляйте систему регулярно**

```bash
apt update && apt upgrade -y
```

3. **Используйте сильные пароли и SSH ключи**

4. **Не храните `.env` в Git**

## 🆘 Решение проблем

### Приложение не запускается

```bash
pm2 logs ton10 --err
# Проверьте ошибки в логах
```

### Порт 3000 занят

```bash
lsof -i :3000
# Убейте процесс или измените PORT в .env
```

### Nginx не проксирует запросы

```bash
nginx -t  # Проверьте конфигурацию
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### База данных не создается

```bash
# Проверьте права доступа
ls -la /var/www/ton10/data/
chmod 755 /var/www/ton10/data/
```

---

**Готово!** Ваш сервер должен работать. 🎉

Если нужна помощь с настройкой - обращайтесь!

