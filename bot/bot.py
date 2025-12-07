import asyncio
import json
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import Message
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем токен бота из переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в переменных окружения. Создайте файл .env и добавьте BOT_TOKEN=your_token")

# Инициализируем бота и диспетчер
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


async def get_user_photo_url(bot: Bot, user_id: int) -> str:
    """Получает URL фотографии профиля пользователя"""
    try:
        # Пытаемся получить фото профиля через get_user_profile_photos
        photos = await bot.get_user_profile_photos(user_id, limit=1)
        if photos.total_count > 0:
            # Получаем самый большой размер фото
            photo = photos.photos[0][-1]
            file = await bot.get_file(photo.file_id)
            # Формируем URL через file_path
            # В реальности нужно использовать bot.get_file_url, но для упрощения используем прямой путь
            return f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"
    except Exception as e:
        # Если не удалось получить фото, возвращаем пустую строку
        # или можно использовать альтернативный формат
        pass
    
    # Возвращаем пустую строку, если фото недоступно
    # В реальных Mini Apps photo_url предоставляется автоматически
    return ""


def format_user_info(user: types.User, photo_url: str = "") -> str:
    """Форматирует информацию о пользователе в JSON-подобный формат"""
    user_data = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name or "",
        "username": user.username or "",
        "language_code": user.language_code or "",
        "is_premium": getattr(user, 'is_premium', False),
        "allows_write_to_pm": True,  # Если пользователь написал боту, значит разрешено
    }
    
    # Добавляем photo_url если он был получен
    if photo_url:
        user_data["photo_url"] = photo_url
    
    return json.dumps(user_data, ensure_ascii=False, indent=2)


@dp.message(Command("start"))
async def cmd_start(message: Message):
    """Обработчик команды /start"""
    user = message.from_user
    
    # Формируем приветственное сообщение
    welcome_text = f"👋 Привет, {user.first_name}!\n\n"
    welcome_text += "📋 Вот вся доступная информация о тебе:\n\n"
    
    # Пытаемся получить фото профиля
    photo_url = await get_user_photo_url(bot, user.id)
    
    # Форматируем данные пользователя
    user_info = format_user_info(user, photo_url)
    
    # Отправляем информацию
    await message.answer(
        f"{welcome_text}```json\n{user_info}\n```",
        parse_mode="Markdown"
    )


@dp.message(Command("info"))
async def cmd_info(message: Message):
    """Обработчик команды /info - показывает информацию о пользователе"""
    user = message.from_user
    
    # Пытаемся получить фото профиля
    photo_url = await get_user_photo_url(bot, user.id)
    
    # Форматируем данные пользователя
    user_info = format_user_info(user, photo_url)
    
    await message.answer(
        f"📋 Информация о тебе:\n\n```json\n{user_info}\n```",
        parse_mode="Markdown"
    )


@dp.message()
async def echo_handler(message: Message):
    """Обработчик всех остальных сообщений"""
    await message.answer(
        "🤖 Используй команды:\n"
        "/start - начать работу с ботом\n"
        "/info - показать информацию о себе"
    )


async def main():
    """Главная функция для запуска бота"""
    print("🚀 Бот запускается...")
    bot_info = await bot.get_me()
    print(f"✅ Бот авторизован как: @{bot_info.username}")
    print("📝 Используй команды /start или /info для получения информации")
    print("⏹️  Нажми Ctrl+C для остановки\n")
    
    # Запускаем polling
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Бот остановлен")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

