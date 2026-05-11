from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User, Session as DbSession, Workspace, WorkspaceMember, Tag
from schemas import RegisterRequest, LoginRequest, SessionOut, UserOut
from auth import hash_password, verify_password, create_token, session_expires_at, make_initials, pick_color
from pydantic import BaseModel
from typing import Optional
from deps import get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/check-email")
def check_email(email: str, db: Session = Depends(get_db)):
    """Returns true if email is already registered"""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    return {"exists": user is not None}


@router.post("/register", response_model=SessionOut)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=body.name.strip(),
        initials=make_initials(body.name),
        color=pick_color(),
        password=hash_password(body.password),
    )
    db.add(user)
    db.flush()

    # Create default workspace for new user
    ws = Workspace(
        id=str(uuid.uuid4()),
        slug=str(uuid.uuid4()),
        name=f"Команда {body.name.strip().split()[0]}",
        ownerId=user.id,
    )
    db.add(ws)
    db.flush()

    member = WorkspaceMember(
        id=str(uuid.uuid4()),
        workspaceId=ws.id,
        userId=user.id,
        role="admin_plus",
    )
    db.add(member)

    # Default tags
    for label, color in [
        ("Frontend", "bg-purple-500/20 text-purple-400"),
        ("Backend",  "bg-blue-500/20 text-blue-400"),
        ("Design",   "bg-pink-500/20 text-pink-400"),
        ("Bug",      "bg-red-500/20 text-red-400"),
    ]:
        db.add(Tag(id=str(uuid.uuid4()), label=label, color=color, workspaceId=ws.id))

    token = create_token()
    session = DbSession(
        id=str(uuid.uuid4()),
        token=token,
        userId=user.id,
        expiresAt=session_expires_at(),
    )
    db.add(session)
    db.commit()

    response.set_cookie(
        "alphatrack_session", token,
        httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30,
    )
    return {"token": token, "user": user}


@router.post("/login", response_model=SessionOut)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(401, "Invalid credentials")

    token = create_token()
    session = DbSession(
        id=str(uuid.uuid4()),
        token=token,
        userId=user.id,
        expiresAt=session_expires_at(),
    )
    db.add(session)
    db.commit()

    response.set_cookie(
        "alphatrack_session", token,
        httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30,
    )
    return {"token": token, "user": user}


@router.post("/logout")
def logout(
    response: Response,
    token: str = None,
    db: Session = Depends(get_db),
):
    if token:
        db.query(DbSession).filter(DbSession.token == token).delete()
        db.commit()
    response.delete_cookie("alphatrack_session")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "initials": user.initials,
        "color": user.color,
    }


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    new_password: Optional[str] = None

@router.patch("/me")
def update_me(body: UpdateProfileRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.name is not None and body.name.strip():
        user.name = body.name.strip()
        user.initials = make_initials(user.name)

    if body.password and body.new_password:
        if not verify_password(body.password, user.password):
            raise HTTPException(400, "Текущий пароль неверен")
        if len(body.new_password) < 6:
            raise HTTPException(400, "Новый пароль должен содержать минимум 6 символов")
        user.password = hash_password(body.new_password)

    db.commit()
    return {"ok": True}
