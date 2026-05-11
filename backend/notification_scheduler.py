import asyncio
import threading
import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from database import SessionLocal
from models import TelegramPendingNotification, TelegramAccount, TelegramNotification, Task
from telegram_bot import send_task_notification, edit_task_notification, BOT_TOKEN
from routers.tasks import _load_task, _serialize_task
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger("notification_scheduler")

def get_task_data(db: Session, task_id: str):
    try:
        task = _load_task(db, task_id)
        return jsonable_encoder(_serialize_task(task))
    except Exception as e:
        logger.error(f"Error loading task {task_id}: {e}")
        return None

async def notification_loop():
    if not BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not found, scheduler will run but not send messages.")
        
    while True:
        try:
            with SessionLocal() as db:
                now = datetime.utcnow()
                
                # Process pending notifications that are due
                # (These are created directly by tasks.py when assignee is added)
                pending_due = db.query(TelegramPendingNotification).filter(
                    TelegramPendingNotification.sent == False,
                    TelegramPendingNotification.scheduledAt <= now
                ).all()
                
                for p in pending_due:
                    task_data = get_task_data(db, p.taskId)
                    if task_data:
                        account = db.query(TelegramAccount).filter(TelegramAccount.userId == p.userId).first()
                        if account:
                            msg_id = await send_task_notification(account.chatId, task_data)
                            if msg_id:
                                notif = TelegramNotification(
                                    taskId=p.taskId,
                                    userId=p.userId,
                                    chatId=account.chatId,
                                    messageId=msg_id,
                                    taskSnapshot=json.dumps(task_data, ensure_ascii=False)
                                )
                                db.add(notif)
                    
                    p.sent = True
                    db.commit()

                # Sync existing notifications when tasks are updated
                recently_updated_tasks = db.query(Task).filter(Task.updatedAt >= now - timedelta(seconds=15)).all()
                for task in recently_updated_tasks:
                    notifs = db.query(TelegramNotification).filter(TelegramNotification.taskId == task.id).all()
                    if notifs:
                        new_data = get_task_data(db, task.id)
                        new_json = json.dumps(new_data, sort_keys=True, ensure_ascii=False)
                        
                        for notif in notifs:
                            old_data = json.loads(notif.taskSnapshot)
                            old_json = json.dumps(old_data, sort_keys=True, ensure_ascii=False)
                            
                            if old_json != new_json:
                                msg_id = await edit_task_notification(notif.chatId, notif.messageId, new_data)
                                if msg_id:
                                    notif.messageId = msg_id
                                    notif.taskSnapshot = json.dumps(new_data, ensure_ascii=False)
                                    db.commit()
                                    
        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}", exc_info=True)
            
        await asyncio.sleep(10)

def start_notification_scheduler():
    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(notification_loop())
        
    t = threading.Thread(target=run, daemon=True)
    t.start()
