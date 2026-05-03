from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from database import get_db
from models import User, Session as DbSession, Workspace, WorkspaceMember, WorkspaceInvite, Tag
from schemas import RegisterRequest, LoginRequest, SessionOut, UserOut, UpdateProfileRequest, ChangePasswordRequest
from auth import hash_password, verify_password, create_token, session_expires_at, make_initials, pick_color
from deps import get_current_user
from permissions import seed_defaults
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/check-email")
def check_email(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    return {"exists": user is not None}


@router.post("/register", response_model=SessionOut)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
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

    invite = None
    if body.invite_token:
        invite = db.query(WorkspaceInvite).filter_by(token=body.invite_token).first()
        if invite:
            if invite.usedAt is not None:
                invite = None
            elif invite.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                invite = None

    if invite:
        db.add(WorkspaceMember(
            id=str(uuid.uuid4()),
            workspaceId=invite.workspaceId,
            userId=user.id,
            role=invite.role or "viewer",
        ))
        invite.usedAt = datetime.now(timezone.utc)
    else:
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

        for label, color in [
            ("Frontend", "bg-purple-500/20 text-purple-400"),
            ("Backend",  "bg-blue-500/20 text-blue-400"),
            ("Design",   "bg-pink-500/20 text-pink-400"),
            ("Bug",      "bg-red-500/20 text-red-400"),
        ]:
            db.add(Tag(id=str(uuid.uuid4()), label=label, color=color, workspaceId=ws.id))

        seed_defaults(db, ws.id)

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
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
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


@router.patch("/me", response_model=UserOut)
def update_me(body: UpdateProfileRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.name is not None:
        new_name = body.name.strip()
        if not new_name:
            raise HTTPException(400, "Name cannot be empty")
        user.name = new_name
        user.initials = make_initials(new_name)
    if body.email is not None:
        new_email = body.email.lower().strip()
        if not new_email:
            raise HTTPException(400, "Email cannot be empty")
        if new_email != user.email and db.query(User).filter(User.email == new_email).first():
            raise HTTPException(400, "Email already in use")
        user.email = new_email
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, user.password):
        raise HTTPException(401, "Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    user.password = hash_password(body.new_password)
    db.commit()
    return {"ok": True}
