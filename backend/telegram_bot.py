"""
AlphaTrack Telegram Bot — full-featured interface
"""
import os
import logging
import asyncio
from datetime import datetime

from telegram import (
    Update, Bot,
    InlineKeyboardButton, InlineKeyboardMarkup,
    ReplyKeyboardMarkup, KeyboardButton,
)
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, filters, ContextTypes,
)
from sqlalchemy.orm import joinedload

from database import SessionLocal
from models import (
    TelegramLinkToken, TelegramAccount, TaskAssignee,
    Task, TaskTag, Comment, User, Contact, ContactPhone,
)

logger = logging.getLogger("telegram_bot")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

PAGE_SIZE = 5

STATUS_EMOJI = {
    "todo":        "⬜ К выполнению",
    "in_progress": "🔵 В работе",
    "done":        "✅ Готово",
    "backlog":     "📋 Бэклог",
}

PRIORITY_EMOJI = {
    "high":   "🔴 Высокий",
    "medium": "🟡 Средний",
    "low":    "🔵 Низкий",
    "none":   "⚪ Нет",
}

# Persistent bottom keyboard shown to all linked users
MAIN_KEYBOARD = ReplyKeyboardMarkup(
    [[KeyboardButton("📋 Все задачи"), KeyboardButton("⚡ Активные задачи")]],
    resize_keyboard=True,
    is_persistent=True,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _h(text: str) -> str:
    """Escape HTML special characters."""
    return str(text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _load_task_full(db, task_id: str):
    return (
        db.query(Task)
        .options(
            joinedload(Task.assignees).joinedload(TaskAssignee.user),
            joinedload(Task.tags).joinedload(TaskTag.tag),
            joinedload(Task.contact).joinedload(Contact.phones),
        )
        .filter_by(id=task_id)
        .first()
    )


def _get_account(db, chat_id: str) -> TelegramAccount | None:
    return db.query(TelegramAccount).filter_by(chatId=chat_id).first()


def _format_task_detail(task: Task) -> str:
    priority = PRIORITY_EMOJI.get(task.priority or "none", "⚪ Нет")
    status = STATUS_EMOJI.get(task.status or "todo", task.status or "")
    sep = "―――――――――――――――――――――"

    parts = [f"📋 <b>{_h(task.title)}</b>  {priority}", ""]

    if task.description and task.description.strip():
        desc = task.description[:400]
        if len(task.description) > 400:
            desc += "..."
        parts.append(_h(desc))
        parts.append("")

    parts.append(sep)
    parts.append(f"Статус:      {status}")

    if task.startDate or task.dueDate:
        s = task.startDate.strftime("%d.%m") if task.startDate else "?"
        d = task.dueDate.strftime("%d.%m") if task.dueDate else "?"
        parts.append(f"Сроки:       📅 {s} → {d}")

    parts.append(sep)

    assignees = [a.user for a in (task.assignees or []) if a.user]
    if assignees:
        parts.append("👥 Исполнители:")
        for u in assignees:
            parts.append(f"  • {_h(u.name)}")
        parts.append(sep)

    tags = [tt.tag for tt in (task.tags or []) if tt.tag]
    if tags:
        parts.append("🏷 Теги:")
        for t in tags:
            parts.append(f"  • {_h(t.label)}")
        parts.append(sep)

    if task.contact:
        c = task.contact
        name = f"{c.firstName or ''} {c.lastName or ''}".strip()
        company = c.company or ""
        contact_line = f"📞 Контакт: {_h(name)}"
        if company:
            contact_line += f" ({_h(company)})"
        parts.append(contact_line)
        for phone in (c.phones or []):
            label = f"{phone.label}: " if phone.label else ""
            parts.append(f"  {label}<code>{_h(phone.number)}</code>")
        parts.append(sep)

    return "\n".join(parts)


def _task_keyboard(
    task: Task, from_mode: str, page: int, is_assignee: bool
) -> InlineKeyboardMarkup:
    rows = []
    if is_assignee and task.status != "done":
        rows.append([
            InlineKeyboardButton(
                "✅ Завершить задачу",
                callback_data=f"d:{task.id}:{from_mode}:{page}",
            )
        ])
    rows.append([
        InlineKeyboardButton(
            "◀️ К списку",
            callback_data=f"b:{from_mode}:{page}",
        )
    ])
    return InlineKeyboardMarkup(rows)


def _list_keyboard(tasks: list[Task], mode: str, page: int, total: int) -> InlineKeyboardMarkup:
    rows = []
    total_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)

    for i, task in enumerate(tasks, 1):
        short = task.title if len(task.title) <= 32 else task.title[:30] + "…"
        status_icon = {"todo": "⬜", "in_progress": "🔵", "done": "✅", "backlog": "📋"}.get(task.status, "•")
        rows.append([InlineKeyboardButton(
            f"{status_icon} {short}",
            callback_data=f"t:{task.id}:{mode}:{page}",
        )])

    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton("◀️ Пред.", callback_data=f"{mode}:{page - 1}"))
    if page < total_pages - 1:
        nav.append(InlineKeyboardButton("След. ▶️", callback_data=f"{mode}:{page + 1}"))
    if nav:
        rows.append(nav)

    return InlineKeyboardMarkup(rows)


async def _show_list(
    update: Update,
    chat_id: str,
    page: int,
    active_only: bool,
    edit: bool = False,
):
    mode = "a" if active_only else "l"
    mode_label = "⚡ Активные задачи" if active_only else "📋 Все задачи"

    with SessionLocal() as db:
        account = _get_account(db, chat_id)
        if not account:
            text = "❌ Аккаунт не привязан. Перейдите в профиль на сайте."
            if edit:
                await update.callback_query.edit_message_text(text)
            else:
                await update.effective_message.reply_text(text, reply_markup=MAIN_KEYBOARD)
            return

        assignee_ids = [a.taskId for a in db.query(TaskAssignee).filter_by(userId=account.userId).all()]
        q = db.query(Task).filter(Task.id.in_(assignee_ids))
        if active_only:
            q = q.filter(Task.status == "in_progress")
        tasks = q.order_by(Task.createdAt.desc()).all()

        total = len(tasks)
        total_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
        page = max(0, min(page, total_pages - 1))
        page_tasks = tasks[page * PAGE_SIZE: (page + 1) * PAGE_SIZE]

        if not page_tasks:
            text = f"{mode_label}\n\nЗадач не найдено."
            markup = InlineKeyboardMarkup([])
        else:
            text = f"<b>{mode_label}</b>  •  стр. {page + 1}/{total_pages}  ({total} задач)\n\nВыберите задачу:"
            markup = _list_keyboard(page_tasks, mode, page, total)

        if edit:
            await update.callback_query.edit_message_text(
                text, reply_markup=markup, parse_mode="HTML"
            )
        else:
            await update.effective_message.reply_text(
                text, reply_markup=markup, parse_mode="HTML"
            )


async def _show_task(
    update: Update,
    chat_id: str,
    task_id: str,
    from_mode: str,
    from_page: int,
    edit: bool = False,
):
    with SessionLocal() as db:
        account = _get_account(db, chat_id)
        if not account:
            return

        task = _load_task_full(db, task_id)
        if not task:
            text = "❌ Задача не найдена."
            if edit:
                await update.callback_query.answer(text, show_alert=True)
            else:
                await update.effective_message.reply_text(text)
            return

        is_assignee = any(a.userId == account.userId for a in (task.assignees or []))
        text = _format_task_detail(task)
        markup = _task_keyboard(task, from_mode, from_page, is_assignee)

        if edit:
            await update.callback_query.edit_message_text(
                text, reply_markup=markup, parse_mode="HTML"
            )
        else:
            await update.effective_message.reply_text(
                text, reply_markup=markup, parse_mode="HTML"
            )


# ─── Handlers ─────────────────────────────────────────────────────────────────

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    chat_id = str(update.message.chat_id)
    username = update.message.from_user.username

    if not args:
        with SessionLocal() as db:
            account = _get_account(db, chat_id)
        if account:
            await update.message.reply_text(
                "👋 Вы уже вошли в AlphaTrack!\n\nИспользуйте кнопки ниже для навигации.",
                reply_markup=MAIN_KEYBOARD,
            )
        else:
            await update.message.reply_text(
                "👋 Привет! Я бот AlphaTrack.\n\n"
                "Перейдите в профиль на сайте и нажмите «Подключить Telegram» — "
                "после этого вы сможете получать уведомления и управлять задачами прямо здесь.",
            )
        return

    token_str = args[0]
    with SessionLocal() as db:
        token_record = db.query(TelegramLinkToken).filter(
            TelegramLinkToken.token == token_str,
            TelegramLinkToken.usedAt == None,
        ).first()

        if not token_record or token_record.expiresAt < datetime.utcnow():
            await update.message.reply_text(
                "❌ Ссылка недействительна или устарела.\n"
                "Сгенерируйте новую в профиле на сайте."
            )
            return

        existing = db.query(TelegramAccount).filter_by(chatId=chat_id).first()
        if existing:
            if existing.userId != token_record.userId:
                await update.message.reply_text("⚠️ Этот Telegram уже привязан к другому аккаунту.")
            else:
                await update.message.reply_text("✅ Аккаунт уже привязан!", reply_markup=MAIN_KEYBOARD)
            return

        token_record.usedAt = datetime.utcnow()

        acc = db.query(TelegramAccount).filter_by(userId=token_record.userId).first()
        if not acc:
            acc = TelegramAccount(userId=token_record.userId, chatId=chat_id, username=username)
            db.add(acc)
        else:
            acc.chatId = chat_id
            acc.username = username

        user = db.query(User).filter_by(id=token_record.userId).first()
        user_name = user.name if user else "Пользователь"
        db.commit()

    await update.message.reply_text(
        f"✅ Привет, <b>{_h(user_name)}</b>! Аккаунт успешно привязан.\n\n"
        f"Теперь вы будете получать уведомления о назначенных задачах.\n"
        f"Используйте кнопки ниже для просмотра задач.",
        reply_markup=MAIN_KEYBOARD,
        parse_mode="HTML",
    )


async def tasks_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await _show_list(update, str(update.message.chat_id), 0, False)


async def active_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await _show_list(update, str(update.message.chat_id), 0, True)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text or ""
    chat_id = str(update.message.chat_id)

    if text == "📋 Все задачи":
        await _show_list(update, chat_id, 0, False)
    elif text == "⚡ Активные задачи":
        await _show_list(update, chat_id, 0, True)
    else:
        await update.message.reply_text(
            "Используйте кнопки ниже для навигации.",
            reply_markup=MAIN_KEYBOARD,
        )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    chat_id = str(query.message.chat_id)

    try:
        parts = data.split(":")

        # ── Pagination: l:N or a:N ──────────────────────────────────────────────
        if len(parts) == 2 and parts[0] in ("l", "a"):
            mode, page_str = parts
            active_only = mode == "a"
            await _show_list(update, chat_id, int(page_str), active_only, edit=True)

        # ── Open task: t:TASK_ID:MODE:PAGE ──────────────────────────────────────
        elif len(parts) == 4 and parts[0] == "t":
            _, task_id, from_mode, from_page = parts
            await _show_task(update, chat_id, task_id, from_mode, int(from_page), edit=True)

        # ── Back to list: b:MODE:PAGE ────────────────────────────────────────────
        elif len(parts) == 3 and parts[0] == "b":
            _, from_mode, from_page = parts
            active_only = from_mode == "a"
            await _show_list(update, chat_id, int(from_page), active_only, edit=True)

        # ── Complete task: d:TASK_ID:MODE:PAGE ───────────────────────────────────
        elif len(parts) == 4 and parts[0] == "d":
            _, task_id, from_mode, from_page = parts
            with SessionLocal() as db:
                account = _get_account(db, chat_id)
                if not account:
                    await query.answer("❌ Аккаунт не привязан", show_alert=True)
                    return

                task = db.query(Task).filter_by(id=task_id).first()
                if not task:
                    await query.answer("❌ Задача не найдена", show_alert=True)
                    return

                is_assignee = db.query(TaskAssignee).filter_by(
                    taskId=task_id, userId=account.userId
                ).first()
                if not is_assignee:
                    await query.answer("❌ Вы не являетесь исполнителем", show_alert=True)
                    return

                task.status = "done"
                task.updatedAt = datetime.utcnow()
                db.commit()

            await query.answer("✅ Задача завершена!")
            active_only = from_mode == "a"
            await _show_list(update, chat_id, int(from_page), active_only, edit=True)

        else:
            logger.warning(f"Unknown callback data: {data!r}")

    except Exception as e:
        logger.error(f"Error in handle_callback (data={data!r}): {e}", exc_info=True)
        try:
            await query.answer("❌ Произошла ошибка. Попробуйте ещё раз.", show_alert=True)
        except Exception:
            pass


# ─── Notifications ────────────────────────────────────────────────────────────

async def send_task_notification(chat_id: str, task_data: dict) -> str | None:
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is missing.")
        return None

    bot = Bot(token=BOT_TOKEN)

    # Build a clean notification message
    priority = PRIORITY_EMOJI.get(task_data.get("priority", "none"), "⚪ Нет")
    status = STATUS_EMOJI.get(task_data.get("status", "todo"), "")
    title = _h(task_data.get("title", "Без названия"))
    assignees = task_data.get("assignees", [])
    names = ", ".join(a.get("user", {}).get("name", "") for a in assignees if a.get("user"))

    text = (
        f"🔔 <b>Вы назначены исполнителем!</b>\n\n"
        f"📋 <b>{title}</b>  {priority}\n"
        f"Статус: {status}\n"
    )
    if names:
        text += f"👥 Исполнители: {_h(names)}\n"

    due = task_data.get("dueDate")
    if due:
        try:
            d = datetime.fromisoformat(str(due).replace("Z", "+00:00"))
            text += f"📅 Срок: {d.strftime('%d.%m.%Y')}\n"
        except Exception:
            pass

    try:
        msg = await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
        return str(msg.message_id)
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        return None


async def edit_task_notification(chat_id: str, message_id: str, task_data: dict) -> str | None:
    if not BOT_TOKEN:
        return None

    bot = Bot(token=BOT_TOKEN)
    priority = PRIORITY_EMOJI.get(task_data.get("priority", "none"), "⚪ Нет")
    status = STATUS_EMOJI.get(task_data.get("status", "todo"), "")
    title = _h(task_data.get("title", "Без названия"))

    text = f"🔔 <b>Задача обновлена</b>\n\n📋 <b>{title}</b>  {priority}\nСтатус: {status}"

    try:
        await bot.edit_message_text(
            chat_id=chat_id, message_id=message_id, text=text, parse_mode="HTML"
        )
        return message_id
    except Exception as e:
        logger.warning(f"Failed to edit, resending. Error: {e}")
        try:
            msg = await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
            return str(msg.message_id)
        except Exception as e2:
            logger.error(f"Error resending: {e2}")
            return None


# ─── Bot startup ──────────────────────────────────────────────────────────────

def run_bot_in_thread():
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not found, skipping bot startup")
        return

    import threading

    async def _run_bot():
        app = Application.builder().token(BOT_TOKEN).build()
        app.add_handler(CommandHandler("start", start_command))
        app.add_handler(CommandHandler("tasks", tasks_command))
        app.add_handler(CommandHandler("active", active_command))
        app.add_handler(CallbackQueryHandler(handle_callback))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        await app.initialize()
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)
        logger.info("Telegram bot polling started")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass
        finally:
            await app.updater.stop()
            await app.stop()
            await app.shutdown()

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
