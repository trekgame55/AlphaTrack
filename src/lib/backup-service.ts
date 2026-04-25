/**
 * Pure backup service — no "use server" directive.
 * Can be safely imported from instrumentation.ts (Node.js runtime).
 */

import fs from "fs";
import path from "path";

const DB_PATH     = path.resolve(process.cwd(), "prisma/dev.db");
const BACKUP_DIR  = path.resolve(process.cwd(), "prisma/backups");
const MAX_BACKUPS = 48; // keep max 48 hourly backups (~2 days)

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function runBackup(): string {
  ensureBackupDir();
  const now = new Date();
  const ts = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const name = `backup_${ts}.db`;
  const dest = path.join(BACKUP_DIR, name);

  if (!fs.existsSync(DB_PATH)) {
    console.warn("[AutoBackup] DB file not found:", DB_PATH);
    return "";
  }

  fs.copyFileSync(DB_PATH, dest);
  console.log(`[AutoBackup] ✓ Created: ${name}`);

  // Prune oldest backups beyond MAX_BACKUPS
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup_") && f.endsWith(".db"))
    .sort(); // lexicographic = chronological (ISO timestamps)

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(0, files.length - MAX_BACKUPS);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[AutoBackup] Pruned old backup: ${f}`);
    }
  }

  return name;
}

let _started = false;

/** Call once from instrumentation.ts. Safe to call multiple times (idempotent). */
export function startAutoBackup(intervalMs = 60 * 60 * 1000 /* 1 hour */) {
  if (_started) return;
  _started = true;

  // Run once at startup (after a short delay so DB is ready)
  setTimeout(() => {
    try { runBackup(); } catch (e) { console.error("[AutoBackup] Startup backup failed:", e); }
  }, 5_000);

  // Then every hour
  setInterval(() => {
    try { runBackup(); } catch (e) { console.error("[AutoBackup] Hourly backup failed:", e); }
  }, intervalMs);

  console.log(`[AutoBackup] Started. Interval: ${intervalMs / 60000} minutes.`);
}
