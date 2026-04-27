"""
Workspace role permissions system.

- Owner (admin_plus) and admin always have all permissions implicitly.
- For role 'member' and 'viewer' permissions are configurable per workspace.
- Defaults are seeded into the role_permissions table when a workspace is created
  (or lazily when first read if missing).

Permission keys:
    tasks.view              — see tasks page / list
    tasks.create            — create new tasks
    tasks.edit              — edit any task in the workspace
    tasks.delete            — delete tasks
    tasks.comment           — add comments
    tasks.attach            — attach files (placeholder, future)
    documents.view          — open documents page
    documents.create        — create new documents
    documents.edit          — edit any document
    documents.delete        — delete documents
    contacts.view           — see contacts
    contacts.manage         — create/edit/delete contacts
    tags.manage             — create/edit/delete tags
    workspace.invite        — generate invite links
"""
from typing import Iterable
from sqlalchemy.orm import Session
from models import RolePermission, WorkspaceMember
import uuid


PERMISSION_KEYS: list[str] = [
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "tasks.comment",
    "tasks.attach",
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "contacts.view",
    "contacts.manage",
    "tags.manage",
    "workspace.invite",
]

# Default values per role (true = allowed)
DEFAULTS: dict[str, dict[str, bool]] = {
    "member": {
        "tasks.view":      True,
        "tasks.create":    True,
        "tasks.edit":      True,
        "tasks.delete":    True,
        "tasks.comment":   True,
        "tasks.attach":    True,
        "documents.view":  True,
        "documents.create":True,
        "documents.edit":  True,
        "documents.delete":False,
        "contacts.view":   True,
        "contacts.manage": True,
        "tags.manage":     True,
        "workspace.invite":False,
    },
    "viewer": {
        "tasks.view":      True,
        "tasks.create":    False,
        "tasks.edit":      False,
        "tasks.delete":    False,
        "tasks.comment":   True,
        "tasks.attach":    False,
        "documents.view":  True,
        "documents.create":False,
        "documents.edit":  False,
        "documents.delete":False,
        "contacts.view":   True,
        "contacts.manage": False,
        "tags.manage":     False,
        "workspace.invite":False,
    },
}

CONFIGURABLE_ROLES = list(DEFAULTS.keys())  # ["member", "viewer"]


def seed_defaults(db: Session, workspace_id: str) -> None:
    """Insert any missing permission rows with their default values for the given workspace."""
    existing = {
        (r.role, r.permKey): r
        for r in db.query(RolePermission).filter_by(workspaceId=workspace_id).all()
    }
    for role, perms in DEFAULTS.items():
        for key, allowed in perms.items():
            if (role, key) not in existing:
                db.add(RolePermission(
                    id=str(uuid.uuid4()),
                    workspaceId=workspace_id,
                    role=role,
                    permKey=key,
                    allowed=allowed,
                ))


def get_matrix(db: Session, workspace_id: str) -> dict[str, dict[str, bool]]:
    """Return {role: {permKey: allowed}} for the workspace, filling missing with defaults."""
    seed_defaults(db, workspace_id)
    db.commit()
    rows = db.query(RolePermission).filter_by(workspaceId=workspace_id).all()
    matrix: dict[str, dict[str, bool]] = {role: dict(perms) for role, perms in DEFAULTS.items()}
    for r in rows:
        if r.role in matrix:
            matrix[r.role][r.permKey] = bool(r.allowed)
    return matrix


def set_matrix(db: Session, workspace_id: str, matrix: dict[str, dict[str, bool]]) -> None:
    """Persist the given matrix, only for known roles/keys."""
    seed_defaults(db, workspace_id)
    rows = db.query(RolePermission).filter_by(workspaceId=workspace_id).all()
    by_key = {(r.role, r.permKey): r for r in rows}
    for role, perms in matrix.items():
        if role not in DEFAULTS:
            continue
        for key, allowed in perms.items():
            if key not in PERMISSION_KEYS:
                continue
            existing = by_key.get((role, key))
            if existing:
                existing.allowed = bool(allowed)
            else:
                db.add(RolePermission(
                    id=str(uuid.uuid4()),
                    workspaceId=workspace_id,
                    role=role,
                    permKey=key,
                    allowed=bool(allowed),
                ))
    db.commit()


def get_user_permissions(db: Session, workspace_id: str, user_id: str) -> dict[str, bool]:
    """Return the effective permission map for a single user in a workspace."""
    member = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not member:
        return {k: False for k in PERMISSION_KEYS}
    if member.role in ("admin_plus", "admin"):
        return {k: True for k in PERMISSION_KEYS}
    matrix = get_matrix(db, workspace_id)
    return matrix.get(member.role, {k: False for k in PERMISSION_KEYS})


def has_permission(db: Session, workspace_id: str, user_id: str, perm_key: str) -> bool:
    perms = get_user_permissions(db, workspace_id, user_id)
    return bool(perms.get(perm_key, False))


def require_permission(db: Session, workspace_id: str, user_id: str, perm_key: str) -> None:
    """Raise HTTPException 403 if the user lacks the given permission."""
    from fastapi import HTTPException
    if not has_permission(db, workspace_id, user_id, perm_key):
        raise HTTPException(403, f"Missing permission: {perm_key}")
