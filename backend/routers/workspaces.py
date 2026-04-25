"""
Python backend — полный workspace роутер с тегами
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Workspace, WorkspaceMember, WorkspaceInvite, User, Tag
from schemas import WorkspaceCreate, WorkspaceOut, WorkspaceShort, MemberOut
from deps import get_current_user
from auth import create_token
from datetime import datetime, timedelta, timezone
import uuid

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _check_member(db, workspace_id: str, user_id: str):
    m = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not m:
        raise HTTPException(403, "Not a member of this workspace")
    return m


@router.get("", response_model=list[WorkspaceShort])
def list_workspaces(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memberships = db.query(WorkspaceMember).filter_by(userId=user.id).all()
    return [m.workspace for m in memberships]


@router.get("/current")
def get_workspace(
    workspace_id: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(WorkspaceMember).filter_by(userId=user.id)
    if workspace_id:
        query = query.filter_by(workspaceId=workspace_id)
    membership = query.order_by(WorkspaceMember.joinedAt).first()
    if not membership:
        raise HTTPException(404, "No workspace found")

    ws = (
        db.query(Workspace)
        .options(
            joinedload(Workspace.members).joinedload(WorkspaceMember.user),
            joinedload(Workspace.tags),
        )
        .filter_by(id=membership.workspaceId)
        .first()
    )

    # Serialize manually to include tags
    return {
        "id": ws.id,
        "slug": ws.slug,
        "name": ws.name,
        "ownerId": ws.ownerId,
        "members": [
            {
                "id": m.id,
                "userId": m.userId,
                "role": m.role,
                "user": {
                    "id": m.user.id,
                    "name": m.user.name,
                    "email": m.user.email,
                    "initials": m.user.initials,
                    "color": m.user.color,
                },
            }
            for m in ws.members
        ],
        "tags": [
            {"id": t.id, "label": t.label, "color": t.color}
            for t in ws.tags
        ],
    }


@router.post("")
def create_workspace(body: WorkspaceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(Workspace).filter_by(ownerId=user.id, name=body.name).first()
    if existing:
        return {"id": existing.id, "slug": existing.slug, "name": existing.name, "ownerId": existing.ownerId, "members": [], "tags": []}

    ws = Workspace(id=str(uuid.uuid4()), slug=str(uuid.uuid4()), name=body.name.strip(), ownerId=user.id)
    db.add(ws)
    db.flush()
    member = WorkspaceMember(id=str(uuid.uuid4()), workspaceId=ws.id, userId=user.id, role="admin_plus")
    db.add(member)
    # Default tags
    default_tags = [
        Tag(id=str(uuid.uuid4()), label="Frontend", color="bg-purple-500/20 text-purple-400", workspaceId=ws.id),
        Tag(id=str(uuid.uuid4()), label="Backend",  color="bg-blue-500/20 text-blue-400",    workspaceId=ws.id),
        Tag(id=str(uuid.uuid4()), label="Design",   color="bg-pink-500/20 text-pink-400",    workspaceId=ws.id),
        Tag(id=str(uuid.uuid4()), label="Bug",      color="bg-red-500/20 text-red-400",      workspaceId=ws.id),
    ]
    for t in default_tags:
        db.add(t)
    db.commit()
    db.refresh(ws)
    return {"id": ws.id, "slug": ws.slug, "name": ws.name, "ownerId": ws.ownerId, "members": [], "tags": []}


@router.get("/all")
def get_all_workspaces(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memberships = (
        db.query(WorkspaceMember)
        .options(joinedload(WorkspaceMember.workspace))
        .filter_by(userId=user.id)
        .order_by(WorkspaceMember.joinedAt)
        .all()
    )
    return [
        {"id": m.workspace.id, "name": m.workspace.name, "slug": m.workspace.slug}
        for m in memberships
    ]


@router.get("/{workspace_id}/members")
def get_members(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    members = (
        db.query(WorkspaceMember)
        .options(joinedload(WorkspaceMember.user))
        .filter_by(workspaceId=workspace_id)
        .all()
    )
    return [
        {
            "id": m.id, "userId": m.userId, "role": m.role,
            "user": {"id": m.user.id, "name": m.user.name, "email": m.user.email,
                     "initials": m.user.initials, "color": m.user.color},
        }
        for m in members
    ]


@router.delete("/{workspace_id}/members/{member_id}")
def remove_member(workspace_id: str, member_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    member = db.query(WorkspaceMember).filter_by(id=member_id, workspaceId=workspace_id).first()
    if not member:
        raise HTTPException(404, "Member not found")
    db.delete(member)
    db.commit()
    return {"ok": True}


@router.post("/{workspace_id}/invite")
def generate_invite(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    token = create_token()
    invite = WorkspaceInvite(
        id=str(uuid.uuid4()),
        workspaceId=workspace_id,
        token=token,
        expiresAt=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    db.commit()
    return {"link": f"/invite/{token}"}


@router.post("/accept-invite")
def accept_invite(token: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    invite = db.query(WorkspaceInvite).filter_by(token=token).first()
    if not invite:
        raise HTTPException(404, "Invite not found")
    if invite.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "Invite expired")
    if invite.usedAt:
        raise HTTPException(400, "Invite already used")

    existing = db.query(WorkspaceMember).filter_by(workspaceId=invite.workspaceId, userId=user.id).first()
    if not existing:
        member = WorkspaceMember(
            id=str(uuid.uuid4()),
            workspaceId=invite.workspaceId,
            userId=user.id,
            role=invite.role,
        )
        db.add(member)

    invite.usedAt = datetime.now(timezone.utc)
    db.commit()
    return {"workspaceId": invite.workspaceId}
