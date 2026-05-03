import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from database import engine, Base, get_db
from sqlalchemy.orm import Session as DbSession
from backup import start_backup_service, list_backups, manual_backup
from deps import get_current_user
from models import User, Workspace, Project

import models
from routers import auth, workspaces, tasks, contacts, documents, tags, fcm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_backup_service()
    yield


app = FastAPI(
    title="AlphaTrack API",
    description="REST API for AlphaTrack",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

_allowed_origins = [
    "http://localhost:4040",
    "http://127.0.0.1:4040",
]
_public_url = os.environ.get("NEXT_PUBLIC_URL")
if _public_url:
    _allowed_origins.append(_public_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api")
app.include_router(workspaces.router,  prefix="/api")
app.include_router(tasks.router,       prefix="/api")
app.include_router(contacts.router,    prefix="/api")
app.include_router(documents.router,   prefix="/api")
app.include_router(tags.router,        prefix="/api")
app.include_router(fcm.router,         prefix="/api")


@app.get("/api/projects")
def list_projects(
    workspace_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from sqlalchemy import asc
    items = db.query(Project).filter(Project.workspaceId == workspace_id).order_by(asc(Project.createdAt)).all()
    return [{"id": p.id, "name": p.name, "color": p.color, "workspaceId": p.workspaceId} for p in items]


@app.post("/api/projects")
def create_project(
    workspace_id: str,
    data: dict,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import uuid
    p = Project(id=str(uuid.uuid4()), name=data["name"], color=data.get("color", "bg-purple-500"), workspaceId=workspace_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "name": p.name, "color": p.color, "workspaceId": p.workspaceId}


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/backup/list")
def get_backups(user: User = Depends(get_current_user)):
    return list_backups()


@app.post("/api/backup/now")
def trigger_backup(user: User = Depends(get_current_user)):
    filename = manual_backup()
    return {"filename": filename}


@app.delete("/api/backup/{filename}")
def delete_backup(filename: str, user: User = Depends(get_current_user)):
    import re
    from backup import BACKUP_DIR
    if not re.match(r'^[\w\-\.]+\.db$', filename):
        raise HTTPException(400, "Invalid filename")
    p = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(p):
        raise HTTPException(404, "Not found")
    os.remove(p)
    return {"ok": True}


@app.get("/api/backup/{filename}/download")
def download_backup(filename: str, user: User = Depends(get_current_user)):
    import re
    from fastapi.responses import FileResponse
    from backup import BACKUP_DIR
    if not re.match(r'^[\w\-\.]+\.db$', filename):
        raise HTTPException(400, "Invalid filename")
    p = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(p):
        raise HTTPException(404, "Not found")
    return FileResponse(p, media_type="application/octet-stream", filename=filename)


@app.get("/api/backup/db/download")
def download_current_db(user: User = Depends(get_current_user)):
    from fastapi.responses import FileResponse
    from backup import DB_PATH
    if not os.path.exists(DB_PATH):
        raise HTTPException(404, "DB not found")
    return FileResponse(DB_PATH, media_type="application/octet-stream", filename="alphatrack.db")


@app.get("/api/stats")
def get_stats(db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    from models import WorkspaceMember, Task, Contact, Comment, Tag as TagModel, Project
    from backup import DB_PATH
    result = {
        "users":      db.query(User).count(),
        "workspaces": db.query(Workspace).count(),
        "members":    db.query(WorkspaceMember).count(),
        "tasks":      db.query(Task).count(),
        "contacts":   db.query(Contact).count(),
        "comments":   db.query(Comment).count(),
        "tags":       db.query(TagModel).count(),
        "projects":   db.query(Project).count(),
        "fileSizeKb": round(os.path.getsize(DB_PATH) / 1024) if os.path.exists(DB_PATH) else 0,
    }
    return result


@app.exception_handler(Exception)
async def global_error_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
