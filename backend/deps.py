"""
Dependency: get current user from session token (header or cookie)
"""
from fastapi import Depends, HTTPException, Header, Cookie
from sqlalchemy.orm import Session
from database import get_db
from models import Session as DbSession, User
from datetime import datetime, timezone
from typing import Optional


def get_current_user(
    x_session_token: Optional[str] = Header(None, alias="x-session-token"),
    weeek_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    token = x_session_token or weeek_session
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = db.query(DbSession).filter(DbSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    if session.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = db.query(User).filter(User.id == session.userId).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
