"""
FastAPI main application entry point
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from database import engine, Base, get_db
from backup import start_backup_service, list_backups, manual_backup
from deps import get_current_user
from models import User

# Import all models so they register with Base
import models  # noqa: F401

# Import routers
from routers import auth, workspaces, tasks, contacts, documents, tags

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Weeek Backend",
    description="REST API for Weeek task management platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — allow Next.js dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4040", "http://0.0.0.0:4040", "http://194.37.80.126:4040", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Starting backup service...")
    start_backup_service()
    logger.info("Backend ready ✓")

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router,        prefix="/api")
app.include_router(workspaces.router,  prefix="/api")
app.include_router(tasks.router,       prefix="/api")
app.include_router(contacts.router,    prefix="/api")
app.include_router(documents.router,   prefix="/api")
app.include_router(tags.router,        prefix="/api")

# ─── Health & Backup endpoints ────────────────────────────────────────────────

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


# ─── Global error handler ────────────────────────────────────────────────────

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
        reload=False,
        log_level="info",
    )
