"""
SQLAlchemy models — mirrors the Prisma schema exactly
"""
from sqlalchemy import (
    Column, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


def gen_id():
    return str(uuid.uuid4())


# ─── Auth ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id        = Column(String, primary_key=True, default=gen_id)
    email     = Column(String, unique=True, nullable=False)
    name      = Column(String, nullable=False)
    initials  = Column(String, default="")
    color     = Column(String, default="bg-violet-500")
    password  = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())

    sessions          = relationship("Session",         back_populates="user",      cascade="all, delete")
    ownedWorkspaces   = relationship("Workspace",       back_populates="owner",     foreign_keys="Workspace.ownerId")
    memberships       = relationship("WorkspaceMember", back_populates="user",      cascade="all, delete")
    taskAssignees     = relationship("TaskAssignee",    back_populates="user",      cascade="all, delete")
    comments          = relationship("Comment",         back_populates="author")


class Session(Base):
    __tablename__ = "sessions"

    id        = Column(String, primary_key=True, default=gen_id)
    token     = Column(String, unique=True, nullable=False)
    userId    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    expiresAt = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="sessions")


# ─── Workspace ────────────────────────────────────────────────────────────────

class Workspace(Base):
    __tablename__ = "workspaces"

    id        = Column(String, primary_key=True, default=gen_id)
    slug      = Column(String, unique=True, default=gen_id)
    name      = Column(String, nullable=False)
    ownerId   = Column(String, ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, server_default=func.now())

    owner    = relationship("User",             back_populates="ownedWorkspaces", foreign_keys=[ownerId])
    members  = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete")
    tags     = relationship("Tag",             back_populates="workspace",  cascade="all, delete")
    contacts = relationship("Contact",         back_populates="workspace",  cascade="all, delete")
    invites  = relationship("WorkspaceInvite", back_populates="workspace",  cascade="all, delete")
    tasks    = relationship("Task",            back_populates="workspace",  cascade="all, delete")
    projects = relationship("Project",         back_populates="workspace",  cascade="all, delete")
    documents= relationship("Document",        back_populates="workspace",  cascade="all, delete")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspaceId", "userId"),)

    id          = Column(String, primary_key=True, default=gen_id)
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    userId      = Column(String, ForeignKey("users.id",      ondelete="CASCADE"), nullable=False)
    role        = Column(String, default="member")
    joinedAt    = Column(DateTime, server_default=func.now())

    workspace = relationship("Workspace", back_populates="members")
    user      = relationship("User",      back_populates="memberships")


class WorkspaceInvite(Base):
    __tablename__ = "workspace_invites"

    id          = Column(String, primary_key=True, default=gen_id)
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    token       = Column(String, unique=True, nullable=False)
    email       = Column(String, nullable=True)
    role        = Column(String, default="member")
    usedAt      = Column(DateTime, nullable=True)
    expiresAt   = Column(DateTime, nullable=False)
    createdAt   = Column(DateTime, server_default=func.now())

    workspace = relationship("Workspace", back_populates="invites")


# ─── Projects ─────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("workspaceId", "name"),)

    id          = Column(String, primary_key=True, default=gen_id)
    name        = Column(String, nullable=False)
    color       = Column(String, default="bg-purple-500")
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    createdAt   = Column(DateTime, server_default=func.now())

    workspace = relationship("Workspace", back_populates="projects")
    tasks     = relationship("Task",      back_populates="project")


# ─── Tags ─────────────────────────────────────────────────────────────────────

class Tag(Base):
    __tablename__ = "tags"

    id          = Column(String, primary_key=True, default=gen_id)
    label       = Column(String, nullable=False)
    color       = Column(String, default="bg-purple-500/20 text-purple-400")
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    workspace = relationship("Workspace", back_populates="tags")
    tasks     = relationship("TaskTag",   back_populates="tag", cascade="all, delete")


# ─── Tasks ────────────────────────────────────────────────────────────────────

class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String, primary_key=True, default=gen_id)
    title       = Column(String, nullable=False)
    description = Column(Text,   nullable=True)
    status      = Column(String, default="todo")
    priority    = Column(String, default="none")
    startDate   = Column(DateTime, nullable=True)
    dueDate     = Column(DateTime, nullable=True)
    group       = Column(String, default="No date")
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    projectId   = Column(String, ForeignKey("projects.id",   ondelete="SET NULL"), nullable=True)
    contactId   = Column(String, ForeignKey("contacts.id",   ondelete="SET NULL"), nullable=True)
    createdAt   = Column(DateTime, server_default=func.now())
    updatedAt   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="tasks")
    project   = relationship("Project",   back_populates="tasks")
    contact   = relationship("Contact",   back_populates="tasks")
    assignees = relationship("TaskAssignee", back_populates="task", cascade="all, delete")
    tags      = relationship("TaskTag",      back_populates="task", cascade="all, delete")
    comments  = relationship("Comment",      back_populates="task", cascade="all, delete",
                             order_by="Comment.createdAt")


class TaskAssignee(Base):
    __tablename__ = "task_assignees"

    taskId = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    createdAt = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="assignees")
    user = relationship("User", back_populates="taskAssignees")


class TaskTag(Base):
    __tablename__ = "task_tags"

    taskId = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    tagId  = Column(String, ForeignKey("tags.id",  ondelete="CASCADE"), primary_key=True)

    task = relationship("Task", back_populates="tags")
    tag  = relationship("Tag",  back_populates="tasks")


class Comment(Base):
    __tablename__ = "comments"

    id        = Column(String, primary_key=True, default=gen_id)
    text      = Column(Text,   nullable=False)
    taskId    = Column(String, ForeignKey("tasks.id",  ondelete="CASCADE"), nullable=False)
    authorId  = Column(String, ForeignKey("users.id"),                      nullable=False)
    createdAt = Column(DateTime, server_default=func.now())

    task   = relationship("Task", back_populates="comments")
    author = relationship("User", back_populates="comments")


# ─── Contacts ─────────────────────────────────────────────────────────────────

class Contact(Base):
    __tablename__ = "contacts"

    id          = Column(String, primary_key=True, default=gen_id)
    firstName   = Column(String, nullable=False)
    lastName    = Column(String, default="")
    company     = Column(String, nullable=True)
    email       = Column(String, nullable=True)
    color       = Column(String, default="bg-violet-500")
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    createdAt   = Column(DateTime, server_default=func.now())

    workspace = relationship("Workspace",    back_populates="contacts")
    phones    = relationship("ContactPhone", back_populates="contact", cascade="all, delete")
    tasks     = relationship("Task",         back_populates="contact")


class ContactPhone(Base):
    __tablename__ = "contact_phones"

    id        = Column(String, primary_key=True, default=gen_id)
    label     = Column(String, nullable=False)
    number    = Column(String, nullable=False)
    contactId = Column(String, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)

    contact = relationship("Contact", back_populates="phones")


# ─── Documents ────────────────────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id          = Column(String, primary_key=True, default=gen_id)
    title       = Column(String, nullable=False, default="Без названия")
    content     = Column(Text,   nullable=True,  default="")
    icon        = Column(String, nullable=True,  default="📄")
    workspaceId = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    authorId    = Column(String, ForeignKey("users.id"),                          nullable=False)
    createdAt   = Column(DateTime, server_default=func.now())
    updatedAt   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="documents")
    author    = relationship("User")


# ─── Telegram ─────────────────────────────────────────────────────────────────

class TelegramAccount(Base):
    __tablename__ = "telegram_accounts"

    id        = Column(String, primary_key=True, default=gen_id)
    userId    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    chatId    = Column(String, unique=True, nullable=False)
    username  = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())

    user      = relationship("User", backref="telegramAccount")


class TelegramNotification(Base):
    __tablename__ = "telegram_notifications"

    id           = Column(String, primary_key=True, default=gen_id)
    taskId       = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    userId       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chatId       = Column(String, nullable=False)
    messageId    = Column(String, nullable=False)
    taskSnapshot = Column(Text,   nullable=False) # JSON text
    createdAt    = Column(DateTime, server_default=func.now())
    updatedAt    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    task         = relationship("Task")
    user         = relationship("User")


class TelegramLinkToken(Base):
    __tablename__ = "telegram_link_tokens"

    id        = Column(String, primary_key=True, default=gen_id)
    userId    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token     = Column(String, unique=True, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    usedAt    = Column(DateTime, nullable=True)

    user      = relationship("User")


class TelegramPendingNotification(Base):
    __tablename__ = "telegram_pending_notifications"

    id          = Column(String, primary_key=True, default=gen_id)
    taskId      = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    userId      = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scheduledAt = Column(DateTime, nullable=False)
    sent        = Column(Boolean, default=False)

    task        = relationship("Task")
    user        = relationship("User")
