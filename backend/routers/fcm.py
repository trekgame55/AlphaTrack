"""
Роутер: регистрация FCM-токенов устройств.

Мобильное приложение должно вызывать POST /fcm/register после каждого входа,
передавая свой текущий FCM-токен. Токен сохраняется в БД и привязывается
к вошедшему пользователю. При назначении исполнителем задачи — бэкенд
найдёт все токены этого пользователя и отправит push.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import FcmToken, User
from deps import get_current_user
import uuid

router = APIRouter(prefix="/fcm", tags=["fcm"])


class FcmRegisterBody(BaseModel):
    token: str


@router.post("/register")
def register_fcm_token(
    body: FcmRegisterBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Сохранить FCM-токен текущего устройства.
    Вызывается мобильным приложением при каждом запуске / входе.
    """
    if not body.token or len(body.token) < 10:
        raise HTTPException(400, "Некорректный FCM токен")

    existing = db.query(FcmToken).filter_by(userId=user.id, token=body.token).first()
    if not existing:
        db.add(FcmToken(id=str(uuid.uuid4()), userId=user.id, token=body.token))
        db.commit()

    return {"success": True}


@router.delete("/unregister")
def unregister_fcm_token(
    body: FcmRegisterBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Удалить FCM-токен (например, при выходе из аккаунта).
    """
    db.query(FcmToken).filter_by(userId=user.id, token=body.token).delete()
    db.commit()
    return {"success": True}
