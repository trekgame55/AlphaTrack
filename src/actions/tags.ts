"use server";

import { api } from "@/lib/api";
import { getToken } from "./workspace";

const log = (lvl: "info" | "error", fn: string, msg: string, d?: unknown) => {
  const pre = `[Tags/${fn}]`;
  if (lvl === "error") console.error(`❌ ${pre} ${msg}`, d ?? "");
  else                 console.log  (`✅ ${pre} ${msg}`, d ?? "");
};

export async function createTag(workspaceId: string, label: string, color: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const tag = await api.tags.create(token, workspaceId, label, color);
    log("info", "createTag", `Created id=${tag.id} label="${tag.label}"`);
    return { tag };
  } catch (err: any) {
    log("error", "createTag", err?.message);
    return { error: err?.message ?? "Ошибка создания тега" };
  }
}

export async function deleteTag(tagId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.tags.delete(token, tagId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message };
  }
}
