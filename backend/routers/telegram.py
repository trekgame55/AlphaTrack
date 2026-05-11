"""
Telegram router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import os

from database import get_db
from models import User, TelegramLinkToken, TelegramAccount
from deps import get_current_user

router = APIRouter(tags=["Telegram"])

@router.post("/telegram/link-token")
def generate_link_token(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(TelegramAccount).filter(TelegramAccount.userId == user.id).first()
    if account:
        raise HTTPException(status_code=400, detail="Telegram account already linked")

    db.query(TelegramLinkToken).filter(TelegramLinkToken.userId == user.id, TelegramLinkToken.usedAt == None).delete()
    
    token_str = secrets.token_urlsafe(16)
    expires = datetime.utcnow() + timedelta(minutes=15)
    
    token = TelegramLinkToken(
        userId=user.id,
        token=token_str,
        expiresAt=expires
    )
    db.add(token)
    db.commit()
    
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "MUIWDFSRHUGF_bot")
    
    return {"token": token_str, "link": f"https://t.me/{bot_username}?start={token_str}"}

@router.get("/telegram/status")
def get_telegram_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(TelegramAccount).filter(TelegramAccount.userId == user.id).first()
    if account:
        return {"connected": True, "username": account.username}
    return {"connected": False}

@router.delete("/telegram/disconnect")
def disconnect_telegram(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(TelegramAccount).filter(TelegramAccount.userId == user.id).first()
    if account:
        db.delete(account)
        db.commit()
    return {"success": True}
