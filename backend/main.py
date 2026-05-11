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
import models  # noqa: F401

from routers import auth, workspaces, tasks, contacts, documents, tags, telegram

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

ALLOWED_ORIGINS = [
    "https://lan9es.online",
    "https://www.lan9es.online",
    "http://localhost:3000",
    "http://localhost:4040",
]

app = FastAPI(
    title="AlphaTrack API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-session-token"],
)


@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("origin")
        if origin and origin not in ALLOWED_ORIGINS:
            logger.warning(f"CSRF block: {request.method} {request.url.path} origin={origin}")
            return JSONResponse(status_code=403, content={"detail": "Forbidden: invalid origin"})
    return await call_next(request)


@app.on_event("startup")
def startup():
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    start_backup_service()

    from telegram_bot import run_bot_in_thread
    from notification_scheduler import start_notification_scheduler
    run_bot_in_thread()
    start_notification_scheduler()

    logger.info("Backend ready ✓")


app.include_router(auth.router,       prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(tasks.router,      prefix="/api")
app.include_router(contacts.router,   prefix="/api")
app.include_router(documents.router,  prefix="/api")
app.include_router(tags.router,       prefix="/api")
app.include_router(telegram.router,   prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/backup/list")
def get_backups(user: User = Depends(get_current_user)):
    return list_backups()


@app.post("/api/backup/now")
def trigger_backup(user: User = Depends(get_current_user)):
    return {"filename": manual_backup()}


@app.exception_handler(Exception)
async def global_error_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
