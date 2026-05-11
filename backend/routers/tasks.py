from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Task, TaskAssignee, TaskTag, Comment, WorkspaceMember, User, Tag, Activity, Contact, FcmToken, TelegramAccount, TelegramPendingNotification
from schemas import TaskCreate, TaskUpdate, TaskOut, CommentCreate, CommentOut
from deps import get_current_user
from permissions import require_permission
from fcm_service import send_push
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _check_member(db, workspace_id: str, user_id: str):
    m = db.query(WorkspaceMember).filter_by(workspaceId=workspace_id, userId=user_id).first()
    if not m:
        raise HTTPException(403, "Not a member of this workspace")
    return m


def _log(db: Session, task_id: str, user_id: str, action: str, details: dict | None = None):
    """Append a single change event to the task's activity log."""
    db.add(Activity(
        id=str(uuid.uuid4()),
        taskId=task_id,
        userId=user_id,
        action=action,
        details=json.dumps(details, ensure_ascii=False) if details else None,
    ))


def _date_only(d) -> str | None:
    """ISO yyyy-mm-dd or None — used to compare/store dates for the activity log."""
    if not d:
        return None
    if isinstance(d, datetime):
        return d.date().isoformat()
    return str(d)[:10]


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
            for a in task.assignees if a.user is not None
        ],
        "tags": [
            {"tag": {"id": tt.tag.id, "label": tt.tag.label, "color": tt.tag.color}}
            for tt in task.tags if tt.tag is not None
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
            for c in task.comments if c.author is not None
        ],
    }


@router.get("")
def list_tasks(workspace_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_member(db, workspace_id, user.id)
    require_permission(db, workspace_id, user.id, "tasks.view")
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
    require_permission(db, body.workspaceId, user.id, "tasks.create")

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

    _log(db, task.id, user.id, "created", {"title": task.title})

    db.commit()
    db.refresh(task)

    # Schedule Telegram notifications for all assignees (including self)
    for uid in body.assigneeIds:
        tg = db.query(TelegramAccount).filter_by(userId=uid).first()
        if tg:
            pending = TelegramPendingNotification(
                id=str(uuid.uuid4()),
                taskId=task.id,
                userId=uid,
                scheduledAt=datetime.now(timezone.utc)
            )
            db.add(pending)
    db.commit()

    return {"task": _serialize_task(_load_task(db, task.id))}


@router.put("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)
    require_permission(db, task.workspaceId, user.id, "tasks.edit")

    # ── Snapshot scalar fields BEFORE mutating, for diff-based activity log ──
    before = {
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "group": task.group,
        "contactId": task.contactId,
        "dueDate": _date_only(task.dueDate),
        "startDate": _date_only(task.startDate),
    }

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

    # ── Log diffs for scalar fields ──
    after = {
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "group": task.group,
        "contactId": task.contactId,
        "dueDate": _date_only(task.dueDate),
        "startDate": _date_only(task.startDate),
    }
    for field in ("title", "description", "status", "priority", "dueDate", "startDate"):
        if before[field] != after[field]:
            _log(db, task_id, user.id, field, {"from": before[field], "to": after[field]})

    if before["contactId"] != after["contactId"]:
        contact_name = None
        if after["contactId"]:
            c = db.query(Contact).filter_by(id=after["contactId"]).first()
            if c:
                contact_name = (f"{c.firstName} {c.lastName}").strip()
        _log(db, task_id, user.id, "contact", {
            "from": before["contactId"], "to": after["contactId"], "name": contact_name,
        })

    # ── Diff assignees ──
    if body.assigneeIds is not None:
        prev_ids = {a.userId for a in db.query(TaskAssignee).filter_by(taskId=task_id).all()}
        valid_user_ids = {u.id for u in db.query(User).filter(User.id.in_(body.assigneeIds)).all()} if body.assigneeIds else set()
        new_ids = {uid for uid in body.assigneeIds if uid in valid_user_ids}

        added   = new_ids  - prev_ids
        removed = prev_ids - new_ids

        if added or removed:
            users_lookup = {u.id: u for u in db.query(User).filter(User.id.in_(added | removed)).all()}
            for uid in added:
                u = users_lookup.get(uid)
                _log(db, task_id, user.id, "assignee_added", {
                    "userId": uid, "name": u.name if u else None,
                })
                # ── Отправляем push-уведомление новому исполнителю ──
                if u and uid != user.id:  # не отправляем себе самому
                    tokens = [
                        t.token for t in
                        db.query(FcmToken).filter_by(userId=uid).all()
                    ]
                    if tokens:
                        send_push(
                            tokens=tokens,
                            title="Новая задача",
                            body=f"Вы назначены исполнителем: {task.title}",
                        )
            for uid in removed:
                u = users_lookup.get(uid)
                _log(db, task_id, user.id, "assignee_removed", {
                    "userId": uid, "name": u.name if u else None,
                })

        db.query(TaskAssignee).filter_by(taskId=task_id).delete()
        for uid in new_ids:
            db.add(TaskAssignee(taskId=task_id, userId=uid))

        # Schedule Telegram notifications for newly added assignees
        for uid in added:
            tg = db.query(TelegramAccount).filter_by(userId=uid).first()
            if tg:
                pending = TelegramPendingNotification(
                    id=str(uuid.uuid4()),
                    taskId=task_id,
                    userId=uid,
                    scheduledAt=datetime.now(timezone.utc)
                )
                db.add(pending)

    # ── Diff tags ──
    if body.tagIds is not None:
        prev_tag_ids = {t.tagId for t in db.query(TaskTag).filter_by(taskId=task_id).all()}
        valid_tag_ids = {t.id for t in db.query(Tag).filter(Tag.id.in_(body.tagIds)).all()} if body.tagIds else set()
        new_tag_ids = {tid for tid in body.tagIds if tid in valid_tag_ids}

        added_t   = new_tag_ids  - prev_tag_ids
        removed_t = prev_tag_ids - new_tag_ids

        if added_t or removed_t:
            tags_lookup = {t.id: t for t in db.query(Tag).filter(Tag.id.in_(added_t | removed_t)).all()}
            for tid in added_t:
                t = tags_lookup.get(tid)
                _log(db, task_id, user.id, "tag_added", {
                    "tagId": tid, "label": t.label if t else None, "color": t.color if t else None,
                })
            for tid in removed_t:
                t = tags_lookup.get(tid)
                _log(db, task_id, user.id, "tag_removed", {
                    "tagId": tid, "label": t.label if t else None, "color": t.color if t else None,
                })

        db.query(TaskTag).filter_by(taskId=task_id).delete()
        for tid in new_tag_ids:
            db.add(TaskTag(taskId=task_id, tagId=tid))

    db.commit()
    return {"task": _serialize_task(_load_task(db, task_id))}


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)
    require_permission(db, task.workspaceId, user.id, "tasks.delete")
    db.delete(task)
    db.commit()
    return {"success": True}


@router.post("/{task_id}/comments")
def add_comment(task_id: str, body: CommentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)
    require_permission(db, task.workspaceId, user.id, "tasks.comment")

    comment = Comment(
        id=str(uuid.uuid4()),
        text=body.text[:4000],
        taskId=task_id,
        authorId=user.id,
    )
    db.add(comment)
    _log(db, task_id, user.id, "comment_added", {"preview": comment.text[:120]})
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


@router.get("/{task_id}/activity")
def get_task_activity(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return the chronological list of changes for a task."""
    task = db.query(Task).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    _check_member(db, task.workspaceId, user.id)
    require_permission(db, task.workspaceId, user.id, "tasks.view")

    rows = (
        db.query(Activity)
        .options(joinedload(Activity.user))
        .filter_by(taskId=task_id)
        .order_by(Activity.createdAt)
        .all()
    )
    return [
        {
            "id": a.id,
            "action": a.action,
            "details": json.loads(a.details) if a.details else None,
            "createdAt": a.createdAt,
            "user": {
                "id": a.user.id, "name": a.user.name,
                "initials": a.user.initials, "color": a.user.color, "email": a.user.email,
            } if a.user else None,
        }
        for a in rows
    ]
