"use server";

import { api } from "@/lib/api";
import { getToken } from "./workspace";

const log = (lvl: "info"|"error", fn: string, msg: string, d?: unknown) => {
  const pre = `[Tasks/${fn}]`;
  if (lvl === "error") console.error(`❌ ${pre} ${msg}`, d ?? "");
  else                 console.log  (`✅ ${pre} ${msg}`, d ?? "");
};

// ─── List tasks ───────────────────────────────────────────────────────────────

export async function listTasks(workspaceId: string) {
  const token = await getToken();
  if (!token) { log("error","listTasks","No token"); return []; }
  try {
    const tasks = await api.tasks.list(token, workspaceId);
    log("info", "listTasks", `wsId=${workspaceId} → ${tasks.length} tasks`);
    return tasks;
  } catch (err: any) {
    log("error", "listTasks", err?.message);
    return [];
  }
}

// ─── Create task ──────────────────────────────────────────────────────────────

export async function createTask(data: {
  title: string;
  workspaceId: string;
  group: string;
  dueDate?: string;
  projectId?: string;
  assigneeIds?: string[];
}) {
  console.log(`\n📝 createTask CALLED — title="${data.title}" wsId=${data.workspaceId}`);
  const token = await getToken();
  if (!token) {
    log("error", "createTask", "No session token in cookie");
    return { error: "Нет авторизации" };
  }
  try {
    const res = await api.tasks.create(token, data);
    log("info", "createTask", `✅ Created id=${res.task.id} title="${res.task.title}"`);
    return { task: res.task };
  } catch (err: any) {
    log("error", "createTask", `FAILED: ${err?.message}`);
    return { error: err?.message ?? "Ошибка создания задачи" };
  }
}

// ─── Update task ──────────────────────────────────────────────────────────────

export async function updateTask(taskId: string, data: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  startDate?: string | null;
  group?: string;
  contactId?: string | null;
  assigneeIds?: string[];
  tagIds?: string[];
}) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const res = await api.tasks.update(token, taskId, data as any);
    log("info", "updateTask", `Updated id=${taskId}`);
    return { task: res.task };
  } catch (err: any) {
    log("error", "updateTask", `FAILED taskId=${taskId}: ${err?.message}`);
    return { error: err?.message };
  }
}

// ─── Delete task ──────────────────────────────────────────────────────────────

export async function deleteTask(taskId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.tasks.delete(token, taskId);
    log("info", "deleteTask", `Deleted id=${taskId}`);
    return { success: true };
  } catch (err: any) {
    log("error", "deleteTask", err?.message);
    return { error: err?.message };
  }
}

// ─── Add comment ──────────────────────────────────────────────────────────────

export async function addComment(taskId: string, text: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const res = await api.tasks.addComment(token, taskId, text);
    log("info", "addComment", `Created comment on taskId=${taskId}`);
    return { comment: res.comment };
  } catch (err: any) {
    log("error", "addComment", err?.message);
    return { error: err?.message };
  }
}
