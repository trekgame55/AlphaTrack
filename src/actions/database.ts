"use server";

import { getToken } from "@/actions/auth";

const API = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "x-session-token": token ?? "", ...(opts.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail ?? `HTTP ${res.status}`);
  }
  return res;
}

export async function getDbStats() {
  try {
    const res = await apiFetch("/api/stats");
    return await res.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function listBackups() {
  try {
    const res = await apiFetch("/api/backup/list");
    const raw: { filename: string; size: number; createdAt: string }[] = await res.json();
    return raw.map(b => ({ name: b.filename, sizeKb: Math.round(b.size / 1024), createdAt: b.createdAt }));
  } catch {
    return [];
  }
}

export async function createBackup() {
  try {
    const res = await apiFetch("/api/backup/now", { method: "POST" });
    const data = await res.json();
    return { success: true, name: data.filename };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteBackup(backupName: string) {
  try {
    await apiFetch(`/api/backup/${encodeURIComponent(backupName)}`, { method: "DELETE" });
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getDownloadUrl(backupName: string): Promise<string> {
  return `${API}/api/backup/${encodeURIComponent(backupName)}/download`;
}

export async function getDbDownloadUrl(): Promise<string> {
  return `${API}/api/backup/db/download`;
}

export async function getSessionToken(): Promise<string | null> {
  return getToken();
}
