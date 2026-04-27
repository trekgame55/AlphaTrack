import bcrypt
from datetime import datetime, timedelta, timezone
import secrets

SESSION_TTL_DAYS = 30


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain[:72].encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain[:72].encode(), hashed.encode())
    except Exception:
        return False


def create_token() -> str:
    return secrets.token_urlsafe(48)


def session_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)


def make_initials(name: str) -> str:
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper() if name else "??"


AVATAR_COLORS = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-amber-500",  "bg-red-500",  "bg-pink-500", "bg-cyan-500",
]

import random
def pick_color() -> str:
    return random.choice(AVATAR_COLORS)
