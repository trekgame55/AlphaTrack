"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    initials: str
    color: str
    model_config = {"from_attributes": True}

class SessionOut(BaseModel):
    token: str
    user: UserOut


# ─── Workspace ────────────────────────────────────────────────────────────────

class MemberOut(BaseModel):
    id: str
    userId: str
    role: str
    user: UserOut
    model_config = {"from_attributes": True}

class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceOut(BaseModel):
    id: str
    slug: str
    name: str
    ownerId: str
    members: List[MemberOut] = []
    model_config = {"from_attributes": True}

class WorkspaceShort(BaseModel):
    id: str
    name: str
    slug: str
    model_config = {"from_attributes": True}


# ─── Tags ─────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    label: str
    color: str = "bg-purple-500/20 text-purple-400"

class TagOut(BaseModel):
    id: str
    label: str
    color: str
    model_config = {"from_attributes": True}


# ─── Tasks ────────────────────────────────────────────────────────────────────

class CommentAuthorOut(BaseModel):
    id: str
    name: str
    initials: str
    color: str
    email: str
    model_config = {"from_attributes": True}

class CommentOut(BaseModel):
    id: str
    text: str
    createdAt: datetime
    author: CommentAuthorOut
    model_config = {"from_attributes": True}

class PhoneOut(BaseModel):
    id: str
    label: str
    number: str
    model_config = {"from_attributes": True}

class ContactShortOut(BaseModel):
    id: str
    firstName: str
    lastName: str
    company: Optional[str] = None
    email: Optional[str] = None
    color: str
    phones: List[PhoneOut] = []
    model_config = {"from_attributes": True}

class ProjectOut(BaseModel):
    id: str
    name: str
    color: str
    model_config = {"from_attributes": True}

class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    startDate: Optional[datetime] = None
    dueDate: Optional[datetime] = None
    group: str
    workspaceId: str
    projectId: Optional[str] = None
    contactId: Optional[str] = None
    project: Optional[ProjectOut] = None
    contact: Optional[ContactShortOut] = None
    assignees: List[dict] = []
    tags: List[dict] = []
    comments: List[CommentOut] = []
    createdAt: datetime
    model_config = {"from_attributes": True}

class TaskCreate(BaseModel):
    title: str
    workspaceId: str
    group: str = "No date"
    dueDate: Optional[str] = None
    projectId: Optional[str] = None
    assigneeIds: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    startDate: Optional[str] = None
    group: Optional[str] = None
    contactId: Optional[str] = None
    assigneeIds: Optional[List[str]] = None
    tagIds: Optional[List[str]] = None

class CommentCreate(BaseModel):
    text: str


# ─── Contacts ─────────────────────────────────────────────────────────────────

class PhoneIn(BaseModel):
    label: str
    number: str

class ContactCreate(BaseModel):
    firstName: str
    lastName: str = ""
    company: Optional[str] = None
    email: Optional[str] = None
    color: str = "bg-violet-500"
    phones: List[PhoneIn] = []

class ContactUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phones: Optional[List[PhoneIn]] = None

class ContactOut(BaseModel):
    id: str
    firstName: str
    lastName: str
    company: Optional[str] = None
    email: Optional[str] = None
    color: str
    workspaceId: str
    phones: List[PhoneOut] = []
    createdAt: datetime
    model_config = {"from_attributes": True}


# ─── Documents ────────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = "Без названия"
    content: str = ""
    icon: str = "📄"

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    icon: Optional[str] = None

class DocumentOut(BaseModel):
    id: str
    title: str
    content: Optional[str] = ""
    icon: Optional[str] = "📄"
    workspaceId: str
    authorId: str
    createdAt: datetime
    updatedAt: datetime
    model_config = {"from_attributes": True}


# ─── Invite ───────────────────────────────────────────────────────────────────

class InviteOut(BaseModel):
    link: str

class AcceptInvite(BaseModel):
    token: str
