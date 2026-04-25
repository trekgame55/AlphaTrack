from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Tag, WorkspaceMember, User
from schemas import TagCreate, TagOut
from deps import get_current_user
import uuid

router = APIRouter(prefix="/tags", tags=["tags"])


def _check_member(db, workspace_id: str, user_id: str):
    m = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not m:
        raise HTTPException(403, "Not a member")
    return m


@router.get("")
def list_tags(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    return db.query(Tag).filter_by(workspaceId=workspace_id).all()


@router.post("")
def create_tag(workspace_id: str, body: TagCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    tag = Tag(
        id=str(uuid.uuid4()),
        label=body.label[:50],
        color=body.color,
        workspaceId=workspace_id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}")
def update_tag(tag_id: str, body: TagCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tag = db.query(Tag).filter_by(id=tag_id).first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    _check_member(db, tag.workspaceId, user.id)
    tag.label = body.label[:50]
    tag.color = body.color
    db.commit()
    return tag


@router.delete("/{tag_id}")
def delete_tag(tag_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tag = db.query(Tag).filter_by(id=tag_id).first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    _check_member(db, tag.workspaceId, user.id)
    db.delete(tag)
    db.commit()
    return {"success": True}
