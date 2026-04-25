from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Contact, ContactPhone, WorkspaceMember, User
from schemas import ContactCreate, ContactUpdate, ContactOut
from deps import get_current_user
import uuid

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _check_member(db, workspace_id: str, user_id: str):
    m = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not m:
        raise HTTPException(403, "Not a member")
    return m


@router.get("")
def list_contacts(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    contacts = (
        db.query(Contact)
        .options(joinedload(Contact.phones))
        .filter_by(workspaceId=workspace_id)
        .order_by(Contact.createdAt)
        .all()
    )
    return contacts


@router.post("")
def create_contact(workspace_id: str, body: ContactCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)

    contact = Contact(
        id=str(uuid.uuid4()),
        firstName=body.firstName[:100],
        lastName=(body.lastName or "")[:100],
        company=body.company,
        email=body.email,
        color=body.color,
        workspaceId=workspace_id,
    )
    db.add(contact)
    db.flush()

    for phone in body.phones:
        db.add(ContactPhone(
            id=str(uuid.uuid4()),
            label=phone.label,
            number=phone.number,
            contactId=contact.id,
        ))

    db.commit()
    db.refresh(contact)
    return contact


@router.put("/{contact_id}")
def update_contact(contact_id: str, body: ContactUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    contact = db.query(Contact).options(joinedload(Contact.phones)).filter_by(id=contact_id).first()
    if not contact:
        raise HTTPException(404, "Contact not found")
    _check_member(db, contact.workspaceId, user.id)

    if body.firstName is not None:
        contact.firstName = body.firstName[:100]
    if body.lastName is not None:
        contact.lastName = body.lastName[:100]
    if body.company is not None:
        contact.company = body.company
    if body.email is not None:
        contact.email = body.email

    if body.phones is not None:
        db.query(ContactPhone).filter_by(contactId=contact_id).delete()
        for phone in body.phones:
            db.add(ContactPhone(
                id=str(uuid.uuid4()),
                label=phone.label,
                number=phone.number,
                contactId=contact_id,
            ))

    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
def delete_contact(contact_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    contact = db.query(Contact).filter_by(id=contact_id).first()
    if not contact:
        raise HTTPException(404, "Contact not found")
    _check_member(db, contact.workspaceId, user.id)
    db.delete(contact)
    db.commit()
    return {"success": True}
