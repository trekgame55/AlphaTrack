from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Task, TaskAssignee, TaskTag, Comment, WorkspaceMember, User, Tag
from schemas import TaskCreate, TaskUpdate, TaskOut, CommentCreate, CommentOut
from deps import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _check_member(db, workspace_id: str, user_id: str):
    m = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not m:
        raise HTTPException(403, "Not a member of this workspace")
    return m


def _load_task(db: Session, task_id: str) -> Task:
    task = (
        db.query(Task)
        .options(
            joinedload(Task.assignees).joinedload(TaskAssignee.user),
            joinedload(Task.tags).joinedload(TaskTag.tag),
            joinedload(Task.comments).joinedload(Comment.author),
            joinedload(Task.project),
            joinedload(Task.contact),
        )
        .filter_by(id=task_id)
        .first()
    )
    if not task:
        raise HTTPException(404, "Task not found")
    return task


def _serialize_task(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "startDate": task.startDate,
        "dueDate": task.dueDate,
        "group": task.group,
        "workspaceId": task.workspaceId,
        "projectId": task.projectId,
        "contactId": task.contactId,
        "createdAt": task.createdAt,
        "project": {"id": task.project.id, "name": task.project.name, "color": task.project.color} if task.project else None,
        "contact": {
            "id": task.contact.id,
            "firstName": task.contact.firstName,
            "lastName": task.contact.lastName,
            "company": task.contact.company,
            "email": task.contact.email,
            "color": task.contact.color,
            "phones": [{"id": p.id, "label": p.label, "number": p.number} for p in task.contact.phones],
        } if task.contact else None,
        "assignees": [
            {
                "user": {
                    "id": a.user.id,
                    "name": a.user.name,
                    "initials": a.user.initials,
                    "color": a.user.color,
                    "email": a.user.email,
                }
            }
            for a in task.assignees
        ],
        "tags": [
            {"tag": {"id": tt.tag.id, "label": tt.tag.label, "color": tt.tag.color}}
            for tt in task.tags
        ],
        "comments": [
            {
                "id": c.id,
                "text": c.text,
                "createdAt": c.createdAt,
                "author": {
                    "id": c.author.id,
                    "name": c.author.name,
                    "initials": c.author.initials,
                    "color": c.author.color,
                    "email": c.author.email,
                },
            }
            for c in task.comments
        ],
    }


@router.get("")
def list_tasks(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    tasks = (
        db.query(Task)
        .options(
            joinedload(Task.assignees).joinedload(TaskAssignee.user),
            joinedload(Task.tags).joinedload(TaskTag.tag),
            joinedload(Task.comments).joinedload(Comment.author),
            joinedload(Task.project),
            joinedload(Task.contact),
        )
        .filter_by(workspaceId=workspace_id)
        .order_by(Task.createdAt)
        .all()
    )
    return [_serialize_task(t) for t in tasks]


@router.post("")
def create_task(body: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, body.workspaceId, user.id)

    due = None
    if body.dueDate:
        try:
            due = datetime.fromisoformat(body.dueDate.replace("Z", "+00:00"))
        except Exception:
            due = None

    task = Task(
        id=str(uuid.uuid4()),
        title=body.title[:500],
        workspaceId=body.workspaceId,
        group=body.group,
        projectId=body.projectId,
        dueDate=due,
    )
    db.add(task)
    db.flush()

    for uid in body.assigneeIds:
        db.add(TaskAssignee(taskId=task.id, userId=uid))

    db.commit()
    return {"task": _serialize_task(_load_task(db, task.id))}


@router.put("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)

    if body.title is not None:
        task.title = body.title[:500]
    if body.description is not None:
        task.description = body.description
    if body.status is not None:
        task.status = body.status
    if body.priority is not None:
        task.priority = body.priority
    if body.group is not None:
        task.group = body.group
    if body.contactId is not None:
        task.contactId = body.contactId if body.contactId != "" else None

    if body.dueDate is not None:
        if body.dueDate == "" or body.dueDate == "null":
            task.dueDate = None
        else:
            try:
                task.dueDate = datetime.fromisoformat(body.dueDate.replace("Z", "+00:00"))
            except Exception:
                task.dueDate = None

    if body.startDate is not None:
        if body.startDate == "" or body.startDate == "null":
            task.startDate = None
        else:
            try:
                task.startDate = datetime.fromisoformat(body.startDate.replace("Z", "+00:00"))
            except Exception:
                task.startDate = None

    if body.assigneeIds is not None:
        db.query(TaskAssignee).filter_by(taskId=task_id).delete()
        for uid in body.assigneeIds:
            db.add(TaskAssignee(taskId=task_id, userId=uid))

    if body.tagIds is not None:
        db.query(TaskTag).filter_by(taskId=task_id).delete()
        for tid in body.tagIds:
            db.add(TaskTag(taskId=task_id, tagId=tid))

    db.commit()
    return {"task": _serialize_task(_load_task(db, task_id))}


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)
    db.delete(task)
    db.commit()
    return {"success": True}


@router.post("/{task_id}/comments")
def add_comment(task_id: str, body: CommentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)

    comment = Comment(
        id=str(uuid.uuid4()),
        text=body.text[:4000],
        taskId=task_id,
        authorId=user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "comment": {
            "id": comment.id,
            "text": comment.text,
            "createdAt": comment.createdAt,
            "author": {
                "id": user.id, "name": user.name,
                "initials": user.initials, "color": user.color, "email": user.email,
            },
        }
    }
