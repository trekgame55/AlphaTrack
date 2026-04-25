"""
Automatic backup service: runs every hour in background thread
"""
import os
import shutil
import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger("backup")

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
MAX_BACKUPS = 48  # keep last 48 hourly backups (2 days)


def _do_backup():
    if not os.path.exists(DB_PATH):
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = os.path.join(BACKUP_DIR, f"app_{ts}.db")
    shutil.copy2(DB_PATH, dst)
    logger.info(f"[Backup] Created {dst}")

    # Prune old backups
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    for old in backups[MAX_BACKUPS:]:
        os.remove(os.path.join(BACKUP_DIR, old))
        logger.info(f"[Backup] Pruned {old}")


def _backup_loop():
    while True:
        try:
            _do_backup()
        except Exception as e:
            logger.error(f"[Backup] Error: {e}")
        time.sleep(3600)  # 1 hour


def start_backup_service():
    """Start background hourly backup thread."""
    t = threading.Thread(target=_backup_loop, daemon=True)
    t.start()
    logger.info("[Backup] Backup service started (hourly)")


def list_backups() -> list[dict]:
    if not os.path.exists(BACKUP_DIR):
        return []
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    result = []
    for f in backups:
        path = os.path.join(BACKUP_DIR, f)
        stat = os.stat(path)
        result.append({
            "filename": f,
            "size": stat.st_size,
            "createdAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return result


def manual_backup() -> str:
    _do_backup()
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    return backups[0] if backups else ""
