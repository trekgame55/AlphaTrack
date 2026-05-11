import os
import logging
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, ContextTypes
from datetime import datetime

from database import SessionLocal
from models import TelegramLinkToken, TelegramAccount

logger = logging.getLogger("telegram_bot")

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

STATUS_EMOJI = {
    "todo": "⬜ В работе",
    "in_progress": "🔵 В работе",
    "done": "✅ Готово",
    "backlog": "🔵 Бэклог"
}

PRIORITY_EMOJI = {
    "high": "🔴 Высокий",
    "medium": "🟡 Средний",
    "low": "🔵 Низкий",
    "none": "⚪ Нет"
}

def format_task_message(task_data: dict) -> str:
    title = task_data.get("title", "Без названия")
    priority_raw = task_data.get("priority", "none")
    priority = PRIORITY_EMOJI.get(priority_raw.lower(), "⚪ Нет")
    
    description = task_data.get("description", "") or ""
    if len(description) > 200:
        description = description[:197] + "..."
        
    status_raw = task_data.get("status", "todo")
    status = STATUS_EMOJI.get(status_raw.lower(), status_raw)
    
    start_date = task_data.get("startDate")
    due_date = task_data.get("dueDate")
    
    dates_str = ""
    if start_date or due_date:
        s_date = datetime.fromisoformat(str(start_date).replace("Z", "+00:00")).strftime("%d.%m") if start_date else "?"
        d_date = datetime.fromisoformat(str(due_date).replace("Z", "+00:00")).strftime("%d.%m") if due_date else "?"
        dates_str = f"Сроки:       📅 {s_date} → {d_date}\n"

    assignees = task_data.get("assignees", [])
    assignees_str = ""
    if assignees:
        names = "\n".join([f"  • {a.get('user', {}).get('name', 'Unknown')}" for a in assignees])
        assignees_str = f"👥 Исполнители:\n{names}\n―――――――――――――――――――――\n"
        
    tags = task_data.get("tags", [])
    tags_str = ""
    if tags:
        tag_labels = "\n".join([f"  • {t.get('tag', {}).get('label', '')}" for t in tags])
        tags_str = f"🏷 Теги:\n{tag_labels}\n―――――――――――――――――――――\n"
        
    contact = task_data.get("contact")
    contact_str = ""
    if contact:
        contact_str = f"📞 Контакт:\nИмя: {contact.get('firstName', '')} {contact.get('lastName', '')}\n"
        address = contact.get("address")
        if address:
            contact_str += f"📍 Адрес: {address}\n"
        phones = contact.get("phones", [])
        if phones:
            for p in phones:
                num = p.get("number", "")
                contact_str += f"Телефон: [{num}](tel:{num.replace(' ', '').replace('-', '')})\n"
        
    msg = f"📋 {title}  {priority}\n\n"
    if description:
        msg += f"{description}\n\n"
        
    msg += f"―――――――――――――――――――――\n"
    msg += f"Статус:      {status}\n"
    if dates_str:
        msg += dates_str
    msg += f"―――――――――――――――――――――\n"
    if assignees_str:
        msg += assignees_str
    if tags_str:
        msg += tags_str
    if contact_str:
        msg += contact_str
    
    return msg

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if not args:
        await update.message.reply_text("Пожалуйста, используйте ссылку для привязки аккаунта из приложения.")
        return

    token_str = args[0]
    chat_id = str(update.message.chat_id)
    username = update.message.from_user.username

    with SessionLocal() as db:
        token_record = db.query(TelegramLinkToken).filter(
            TelegramLinkToken.token == token_str,
            TelegramLinkToken.usedAt == None
        ).first()

        if not token_record or token_record.expiresAt < datetime.utcnow():
            await update.message.reply_text("Токен недействителен или устарел. Сгенерируйте новую ссылку.")
            return

        existing_acc = db.query(TelegramAccount).filter(TelegramAccount.chatId == chat_id).first()
        if existing_acc:
            if existing_acc.userId != token_record.userId:
                await update.message.reply_text("Этот Telegram аккаунт уже привязан к другому пользователю.")
                return
            else:
                await update.message.reply_text("Ваш аккаунт уже привязан!")
                return

        token_record.usedAt = datetime.utcnow()
        
        account = db.query(TelegramAccount).filter(TelegramAccount.userId == token_record.userId).first()
        if not account:
            account = TelegramAccount(
                userId=token_record.userId,
                chatId=chat_id,
                username=username
            )
            db.add(account)
        else:
            account.chatId = chat_id
            account.username = username
            
        db.commit()

        await update.message.reply_text("✅ Telegram аккаунт успешно привязан к AlphaTrack!")

async def send_task_notification(chat_id: str, task_data: dict) -> str:
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is missing. Cannot send notification.")
        return None
        
    bot = Bot(token=BOT_TOKEN)
    text = format_task_message(task_data)
    try:
        msg = await bot.send_message(chat_id=chat_id, text=text, parse_mode='Markdown')
        return str(msg.message_id)
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return None

async def edit_task_notification(chat_id: str, message_id: str, task_data: dict) -> str:
    if not BOT_TOKEN:
        return None
        
    bot = Bot(token=BOT_TOKEN)
    text = format_task_message(task_data)
    try:
        await bot.edit_message_text(chat_id=chat_id, message_id=message_id, text=text, parse_mode='Markdown')
        return message_id
    except Exception as e:
        logger.warning(f"Failed to edit message {message_id}, trying to resend. Error: {e}")
        try:
            msg = await bot.send_message(chat_id=chat_id, text=text, parse_mode='Markdown')
            return str(msg.message_id)
        except Exception as e2:
            logger.error(f"Error resending message: {e2}")
            return None

def run_bot_in_thread():
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not found, skipping bot startup")
        return
        
    import asyncio
    import threading

    async def _run_bot():
        application = Application.builder().token(BOT_TOKEN).build()
        application.add_handler(CommandHandler("start", start_command))
        await application.initialize()
        await application.start()
        await application.updater.start_polling(drop_pending_updates=True)
        logger.info("Telegram bot polling started")
        # Keep running until cancelled
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass
        finally:
            await application.updater.stop()
            await application.stop()
            await application.shutdown()

    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_run_bot())
        except Exception as e:
            logger.error(f"Telegram bot error: {e}")

    t = threading.Thread(target=run, daemon=True)
    t.start()
    logger.info("Telegram bot thread started")
