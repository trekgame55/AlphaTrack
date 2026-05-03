"""
Python backend — полный workspace роутер с тегами
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Workspace, WorkspaceMember, WorkspaceInvite, User, Tag
from schemas import WorkspaceCreate, WorkspaceOut, WorkspaceShort, MemberOut, GenerateInviteRequest, MemberRoleUpdate
from deps import get_current_user
from auth import create_token
from permissions import (
    PERMISSION_KEYS, CONFIGURABLE_ROLES, DEFAULTS,
    seed_defaults, get_matrix, set_matrix, get_user_permissions,
    require_permission,
)
from datetime import datetime, timedelta, timezone
from typing import Optional
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

    # Compute current user's effective permissions for this workspace
    my_perms = get_user_permissions(db, ws.id, user.id)

    # Serialize manually to include tags
    return {
        "id": ws.id,
        "slug": ws.slug,
        "name": ws.name,
        "ownerId": ws.ownerId,
        "myRole": membership.role,
        "myPermissions": my_perms,
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
    # Seed default role permissions for member/viewer
    seed_defaults(db, ws.id)
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
    me = _check_member(db, workspace_id, user.id)
    _require_admin(me)
    member = db.query(WorkspaceMember).filter_by(id=member_id, workspaceId=workspace_id).first()
    if not member:
        raise HTTPException(404, "Member not found")
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if ws and ws.ownerId == member.userId:
        raise HTTPException(400, "Cannot remove the workspace owner")
    db.delete(member)
    db.commit()
    return {"ok": True}


VALID_ROLES = {"admin_plus", "admin", "member", "viewer"}


def _require_admin(member: WorkspaceMember):
    if member.role not in ("admin_plus", "admin"):
        raise HTTPException(403, "Admin rights required")


@router.post("/{workspace_id}/invite")
def generate_invite(
    workspace_id: str,
    body: Optional[GenerateInviteRequest] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _check_member(db, workspace_id, user.id)
    require_permission(db, workspace_id, user.id, "workspace.invite")
    # Non-admins may not create admin-level invites
    requested_role = (body.role if body and body.role else "viewer")
    if me.role not in ("admin_plus", "admin") and requested_role in ("admin_plus", "admin"):
        raise HTTPException(403, "Only admins can invite admins")
    role = requested_role
    if role not in VALID_ROLES:
        raise HTTPException(400, "Invalid role")
    token = create_token()
    invite = WorkspaceInvite(
        id=str(uuid.uuid4()),
        workspaceId=workspace_id,
        token=token,
        role=role,
        expiresAt=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    db.commit()
    return {"link": f"/invite/{token}", "token": token, "role": role}


@router.get("/{workspace_id}/invites")
def list_invites(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    me = _check_member(db, workspace_id, user.id)
    require_permission(db, workspace_id, user.id, "workspace.invite")
    invites = db.query(WorkspaceInvite).filter_by(workspaceId=workspace_id).order_by(WorkspaceInvite.createdAt.desc()).all()
    return [
        {
            "id": inv.id,
            "token": inv.token,
            "role": inv.role,
            "expiresAt": inv.expiresAt.isoformat() if inv.expiresAt else None,
            "usedAt": inv.usedAt.isoformat() if inv.usedAt else None,
            "createdAt": inv.createdAt.isoformat() if inv.createdAt else None,
        }
        for inv in invites
    ]


@router.delete("/{workspace_id}/invites/{invite_id}")
def revoke_invite(workspace_id: str, invite_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    me = _check_member(db, workspace_id, user.id)
    require_permission(db, workspace_id, user.id, "workspace.invite")
    inv = db.query(WorkspaceInvite).filter_by(id=invite_id, workspaceId=workspace_id).first()
    if not inv:
        raise HTTPException(404, "Invite not found")
    db.delete(inv)
    db.commit()
    return {"ok": True}


@router.patch("/{workspace_id}/members/{member_id}")
def update_member_role(
    workspace_id: str, member_id: str, body: MemberRoleUpdate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    me = _check_member(db, workspace_id, user.id)
    _require_admin(me)
    if body.role not in VALID_ROLES:
        raise HTTPException(400, "Invalid role")
    member = db.query(WorkspaceMember).filter_by(id=member_id, workspaceId=workspace_id).first()
    if not member:
        raise HTTPException(404, "Member not found")
    # Prevent the workspace owner from being demoted
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if ws and ws.ownerId == member.userId and body.role != "admin_plus":
        raise HTTPException(400, "Cannot change owner's role")
    member.role = body.role
    db.commit()
    return {"id": member.id, "role": member.role}


@router.patch("/{workspace_id}")
def rename_workspace(
    workspace_id: str, body: WorkspaceCreate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    me = _check_member(db, workspace_id, user.id)
    _require_admin(me)
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    new_name = (body.name or "").strip()
    if not new_name:
        raise HTTPException(400, "Name cannot be empty")
    ws.name = new_name
    db.commit()
    return {"id": ws.id, "name": ws.name}


@router.post("/{workspace_id}/leave")
def leave_workspace(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    me = _check_member(db, workspace_id, user.id)
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if ws and ws.ownerId == user.id:
        raise HTTPException(400, "Owner cannot leave workspace; transfer ownership or delete it")
    db.delete(me)
    db.commit()
    return {"ok": True}


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    if ws.ownerId != user.id:
        raise HTTPException(403, "Only the owner can delete the workspace")
    db.delete(ws)
    db.commit()
    return {"ok": True}


@router.get("/{workspace_id}/permissions")
def get_permissions(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    me = _check_member(db, workspace_id, user.id)
    return {
        "keys": PERMISSION_KEYS,
        "configurableRoles": CONFIGURABLE_ROLES,
        "matrix": get_matrix(db, workspace_id),
        "myRole": me.role,
        "myPermissions": get_user_permissions(db, workspace_id, user.id),
    }


@router.put("/{workspace_id}/permissions")
def update_permissions(
    workspace_id: str,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _check_member(db, workspace_id, user.id)
    _require_admin(me)
    matrix = body.get("matrix") or {}
    if not isinstance(matrix, dict):
        raise HTTPException(400, "matrix must be an object")
    set_matrix(db, workspace_id, matrix)
    return {"matrix": get_matrix(db, workspace_id)}


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
