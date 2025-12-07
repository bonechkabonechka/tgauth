import asyncio
import json
import os
import aiohttp
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем токен бота из переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")
API_URL = os.getenv("API_URL", "https://tgauth2.vercel.app/api")  # URL вашего API

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в переменных окружения. Создайте файл .env и добавьте BOT_TOKEN=your_token")

# Инициализируем бота и диспетчер
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


async def get_user_photo_url(bot: Bot, user_id: int) -> str:
    """Получает URL фотографии профиля пользователя"""
    try:
        photos = await bot.get_user_profile_photos(user_id, limit=1)
        if photos.total_count > 0:
            photo = photos.photos[0][-1]
            file = await bot.get_file(photo.file_id)
            return f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"
    except Exception:
        pass
    return ""


async def send_auth_to_server(token: str, user: types.User, photo_url: str) -> dict | None:
    """Отправляет данные пользователя на сервер для завершения авторизации"""
    try:
        async with aiohttp.ClientSession() as session:
            user_data = {
                "token": token,
                "user": {
                    "tg_id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name or "",
                    "username": user.username or "",
                    "photo_url": photo_url,
                }
            }
            
            async with session.post(
                f"{API_URL}/auth/browser/complete",
                json=user_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    print(f"Ошибка API: {response.status} - {error_text}")
                    return None
    except Exception as e:
        print(f"Ошибка отправки на сервер: {e}")
        return None


@dp.message(Command("start"))
async def cmd_start(message: Message):
    """Обработчик команды /start"""
    user = message.from_user
    command_args = message.text.split()
    
    # Проверяем, есть ли параметр auth_UUID
    if len(command_args) > 1 and command_args[1].startswith("auth_"):
        # Извлекаем UUID токен
        token = command_args[1].replace("auth_", "")
        
        # Получаем фото профиля
        photo_url = await get_user_photo_url(bot, user.id)
        
        # Отправляем данные на сервер
        result = await send_auth_to_server(token, user, photo_url)
        
        if result and result.get("success"):
            # Авторизация успешна
            callback_url = result.get("callbackUrl", "https://tgauth2.vercel.app")
            
            # Создаем кнопку для возврата на сайт
            keyboard = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(
                    text="✅ Открыть сайт",
                    url=callback_url
                )
            ]])
            
            await message.answer(
                f"✅ Авторизация успешна, {user.first_name}!\n\n"
                f"Нажмите кнопку ниже, чтобы вернуться на сайт.",
                reply_markup=keyboard
            )
        else:
            # Ошибка авторизации
            await message.answer(
                f"❌ Ошибка авторизации.\n\n"
                f"Возможные причины:\n"
                f"• Ссылка устарела (действительна 5 минут)\n"
                f"• Сессия уже использована\n"
                f"• Ошибка на сервере\n\n"
                f"Попробуйте авторизоваться заново на сайте."
            )
    else:
        # Обычная команда /start без параметров
        welcome_text = f"👋 Привет, {user.first_name}!\n\n"
        welcome_text += "Этот бот используется для авторизации на сайте.\n\n"
        welcome_text += "Для входа перейдите на сайт и нажмите кнопку 'Войти через Telegram'."
        
        await message.answer(welcome_text)


@dp.message(Command("info"))
async def cmd_info(message: Message):
    """Обработчик команды /info - показывает информацию о пользователе"""
    user = message.from_user
    
    # Пытаемся получить фото профиля
    photo_url = await get_user_photo_url(bot, user.id)
    
    # Форматируем данные пользователя
    user_data = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name or "",
        "username": user.username or "",
        "language_code": user.language_code or "",
        "is_premium": getattr(user, 'is_premium', False),
        "allows_write_to_pm": True,
    }
    
    if photo_url:
        user_data["photo_url"] = photo_url
    
    user_info = json.dumps(user_data, ensure_ascii=False, indent=2)
    
    await message.answer(
        f"📋 Информация о тебе:\n\n\n{user_info}\n```",
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
    print(f"🌐 API URL: {API_URL}")
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
