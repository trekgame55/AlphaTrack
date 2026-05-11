import os
import logging
import asyncio
from datetime import datetime

from telegram import Update, Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

from database import SessionLocal
from models import TelegramLinkToken, TelegramAccount, TaskAssignee, Task, User

logger = logging.getLogger("telegram_bot")

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

STATUS_EMOJI = {
    "todo": "⬜ К выполнению",
    "in_progress": "🔵 В работе",
    "done": "✅ Готово",
    "backlog": "📋 Бэклог",
}

PRIORITY_EMOJI = {
    "high": "🔴 Высокий",
    "medium": "🟡 Средний",
    "low": "🔵 Низкий",
    "none": "⚪ Нет",
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
        dates_str = f"📅 Сроки: {s_date} → {d_date}\n"

    assignees = task_data.get("assignees", [])
    assignees_str = ""
    if assignees:
        names = ", ".join([a.get("user", {}).get("name", "Unknown") for a in assignees])
        assignees_str = f"👥 {names}\n"

    msg = f"📋 *{title}*\n"
    msg += f"Приоритет: {priority}\n"
    msg += f"Статус: {status}\n"
    if dates_str:
        msg += dates_str
    if assignees_str:
        msg += assignees_str
    if description:
        msg += f"\n_{description}_"

    return msg


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command — with or without a deeplink token."""
    args = context.args
    if not args:
        await update.message.reply_text(
            "👋 Привет! Я бот AlphaTrack.\n\n"
            "Чтобы привязать аккаунт, перейдите в профиль на сайте и нажмите «Подключить Telegram».\n\n"
            "После привязки вы сможете:\n"
            "• Получать уведомления о назначенных задачах\n"
            "• Просматривать список своих задач командой /tasks"
        )
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
            await update.message.reply_text(
                "❌ Ссылка недействительна или устарела.\n"
                "Сгенерируйте новую ссылку в профиле на сайте."
            )
            return

        # Check if this chat is already linked to another user
        existing_acc = db.query(TelegramAccount).filter(TelegramAccount.chatId == chat_id).first()
        if existing_acc:
            if existing_acc.userId != token_record.userId:
                await update.message.reply_text("⚠️ Этот Telegram аккаунт уже привязан к другому пользователю.")
                return
            else:
                await update.message.reply_text("✅ Ваш аккаунт уже привязан!")
                return

        token_record.usedAt = datetime.utcnow()

        account = db.query(TelegramAccount).filter(TelegramAccount.userId == token_record.userId).first()
        if not account:
            account = TelegramAccount(
                userId=token_record.userId,
                chatId=chat_id,
                username=username,
            )
            db.add(account)
        else:
            account.chatId = chat_id
            account.username = username

        db.commit()

        user = db.query(User).filter(User.id == token_record.userId).first()
        user_name = user.name if user else "Пользователь"

        await update.message.reply_text(
            f"✅ Аккаунт успешно привязан!\n\n"
            f"Привет, *{user_name}*! Теперь вы будете получать уведомления о задачах, "
            f"в которых вас назначат исполнителем.\n\n"
            f"Напишите /tasks чтобы увидеть список ваших текущих задач.",
            parse_mode="Markdown"
        )


async def tasks_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show the user's assigned tasks."""
    chat_id = str(update.message.chat_id)

    with SessionLocal() as db:
        account = db.query(TelegramAccount).filter(TelegramAccount.chatId == chat_id).first()
        if not account:
            await update.message.reply_text(
                "❌ Ваш Telegram не привязан к аккаунту AlphaTrack.\n"
                "Перейдите в профиль на сайте и нажмите «Подключить Telegram»."
            )
            return

        # Get active (non-done) tasks assigned to user
        assignees = db.query(TaskAssignee).filter(TaskAssignee.userId == account.userId).all()
        task_ids = [a.taskId for a in assignees]

        if not task_ids:
            await update.message.reply_text("📭 У вас нет назначенных задач.")
            return

        tasks = db.query(Task).filter(
            Task.id.in_(task_ids),
            Task.status != "done"
        ).order_by(Task.createdAt.desc()).limit(10).all()

        if not tasks:
            await update.message.reply_text("🎉 Все ваши задачи выполнены!")
            return

        msg = f"📋 *Ваши задачи* ({len(tasks)} активных):\n\n"
        for i, task in enumerate(tasks, 1):
            status = STATUS_EMOJI.get(task.status, task.status)
            priority = PRIORITY_EMOJI.get(task.priority, "⚪ Нет")
            due = ""
            if task.dueDate:
                due = f" · 📅 {task.dueDate.strftime('%d.%m')}"
            msg += f"{i}. *{task.title}*\n"
            msg += f"   {status} · {priority}{due}\n\n"

        await update.message.reply_text(msg, parse_mode="Markdown")


async def send_task_notification(chat_id: str, task_data: dict) -> str:
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is missing. Cannot send notification.")
        return None

    bot = Bot(token=BOT_TOKEN)
    text = format_task_message(task_data)
    try:
        msg = await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
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
        await bot.edit_message_text(
            chat_id=chat_id, message_id=message_id, text=text, parse_mode="Markdown"
        )
        return message_id
    except Exception as e:
        logger.warning(f"Failed to edit message {message_id}, resending. Error: {e}")
        try:
            msg = await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
            return str(msg.message_id)
        except Exception as e2:
            logger.error(f"Error resending message: {e2}")
            return None


def run_bot_in_thread():
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not found, skipping bot startup")
        return

    import threading

    async def _run_bot():
        application = Application.builder().token(BOT_TOKEN).build()
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("tasks", tasks_command))
        await application.initialize()
        await application.start()
        await application.updater.start_polling(drop_pending_updates=True)
        logger.info("Telegram bot polling started")
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
