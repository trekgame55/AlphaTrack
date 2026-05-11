"""
FastAPI main application entry point
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from database import engine, Base, get_db
from backup import start_backup_service, list_backups, manual_backup
from deps import get_current_user
from models import User

# Import all models so they register with Base
import models  # noqa: F401

# Import routers
from routers import auth, workspaces, tasks, contacts, documents, tags, telegram

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

# ─── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ─── Allowed origins ──────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    "https://lan9es.online",
    "https://www.lan9es.online",
    "http://localhost:3000",
    "http://localhost:4040",
]

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AlphaTrack API",
    description="REST API for AlphaTrack task management platform",
    version="1.0.0",
    # Disable public docs in production
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — strict origin list only
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-session-token"],
)


# ─── CSRF check middleware ─────────────────────────────────────────────────────

@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    """Block cross-origin state-mutating requests that don't come from the app."""
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("origin")
        # Telegram bot calls are internal (no Origin header) — allow them
        if origin and origin not in ALLOWED_ORIGINS:
            logger.warning(f"CSRF block: method={request.method} origin={origin} path={request.url.path}")
            return JSONResponse(
                status_code=403,
                content={"detail": "Forbidden: invalid origin"},
            )
    return await call_next(request)


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Starting backup service...")
    start_backup_service()

    from telegram_bot import run_bot_in_thread
    from notification_scheduler import start_notification_scheduler
    logger.info("Starting Telegram Bot...")
    run_bot_in_thread()
    logger.info("Starting Notification Scheduler...")
    start_notification_scheduler()

    logger.info("Backend ready ✓")


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router,        prefix="/api")
app.include_router(workspaces.router,  prefix="/api")
app.include_router(tasks.router,       prefix="/api")
app.include_router(contacts.router,    prefix="/api")
app.include_router(documents.router,   prefix="/api")
app.include_router(tags.router,        prefix="/api")
app.include_router(telegram.router,    prefix="/api")


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


# ─── Global error handler ─────────────────────────────────────────────────────

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
