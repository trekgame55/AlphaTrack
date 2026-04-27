from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Document, WorkspaceMember, User
from schemas import DocumentCreate, DocumentUpdate, DocumentOut
from deps import get_current_user
from permissions import require_permission
import uuid

router = APIRouter(prefix="/documents", tags=["documents"])


def _check_member(db, workspace_id: str, user_id: str):
    m = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not m:
        raise HTTPException(403, "Not a member")
    return m


@router.get("")
def list_documents(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    require_permission(db, workspace_id, user.id, "documents.view")
    docs = (
        db.query(Document)
        .filter_by(workspaceId=workspace_id)
        .order_by(Document.updatedAt.desc())
        .all()
    )
    return docs


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    _check_member(db, doc.workspaceId, user.id)
    require_permission(db, doc.workspaceId, user.id, "documents.view")
    return doc


@router.post("")
def create_document(workspace_id: str, body: DocumentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    require_permission(db, workspace_id, user.id, "documents.create")
    doc = Document(
        id=str(uuid.uuid4()),
        title=body.title[:300],
        content=body.content,
        icon=body.icon,
        workspaceId=workspace_id,
        authorId=user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.put("/{doc_id}")
def update_document(doc_id: str, body: DocumentUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    _check_member(db, doc.workspaceId, user.id)
    require_permission(db, doc.workspaceId, user.id, "documents.edit")

    if body.title is not None:
        doc.title = body.title[:300]
    if body.content is not None:
        doc.content = body.content
    if body.icon is not None:
        doc.icon = body.icon

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    _check_member(db, doc.workspaceId, user.id)
    require_permission(db, doc.workspaceId, user.id, "documents.delete")
    db.delete(doc)
    db.commit()
    return {"success": True}
