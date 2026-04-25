"use server";

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");
const BACKUP_DIR = path.resolve(process.cwd(), "prisma/backups");

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ─── Get DB stats ─────────────────────────────────────────────────────────────

export async function getDbStats() {
  const [
    users, workspaces, members, projects, tasks,
    contacts, phones, tags, comments, sessions,
  ] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.workspaceMember.count(),
    db.project.count(),
    db.task.count(),
    db.contact.count(),
    db.contactPhone.count(),
    db.tag.count(),
    db.comment.count(),
    db.session.count(),
  ]);

  const stat = fs.statSync(DB_PATH);
  const fileSizeKb = Math.round(stat.size / 1024);

  return { users, workspaces, members, projects, tasks, contacts, phones, tags, comments, sessions, fileSizeKb };
}

// ─── List backups ─────────────────────────────────────────────────────────────

export async function listBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".db"))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(p);
      return { name: f, sizeKb: Math.round(stat.size / 1024), createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return files;
}

// ─── Create backup ────────────────────────────────────────────────────────────

export async function createBackup() {
  ensureBackupDir();
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const backupName = `backup_${ts}.db`;
  const dest = path.join(BACKUP_DIR, backupName);
  fs.copyFileSync(DB_PATH, dest);
  return { success: true, name: backupName };
}

// ─── Restore from backup ──────────────────────────────────────────────────────

export async function restoreBackup(backupName: string) {
  const src = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(src)) return { error: "Резервная копия не найдена" };
  // Safety: backup current first
  await createBackup();
  fs.copyFileSync(src, DB_PATH);
  return { success: true };
}

// ─── Delete backup ────────────────────────────────────────────────────────────

export async function deleteBackup(backupName: string) {
  const p = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(p)) return { error: "Файл не найден" };
  fs.unlinkSync(p);
  return { success: true };
}

// ─── Export full DB as JSON ───────────────────────────────────────────────────

export async function exportDatabaseJson() {
  const [users, workspaces, projects, tasks, contacts, tags] = await Promise.all([
    db.user.findMany({ select: { id: true, email: true, name: true, initials: true, color: true, createdAt: true } }),
    db.workspace.findMany({ include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } }),
    db.project.findMany(),
    db.task.findMany({ include: { assignees: true, tags: true, comments: { include: { author: { select: { id: true, name: true } } } } } }),
    db.contact.findMany({ include: { phones: true } }),
    db.tag.findMany(),
  ]);

  return JSON.stringify({ exportedAt: new Date().toISOString(), users, workspaces, projects, tasks, contacts, tags }, null, 2);
}

// ─── Read backup file as base64 (for download) ───────────────────────────────

export async function readBackupBase64(backupName: string) {
  const p = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(p)) return { error: "Файл не найден" };
  const buf = fs.readFileSync(p);
  return { base64: buf.toString("base64"), name: backupName };
}

// ─── Read current DB as base64 (for download) ────────────────────────────────

export async function readCurrentDbBase64() {
  const buf = fs.readFileSync(DB_PATH);
  return { base64: buf.toString("base64"), name: "flowdesk.db" };
}
