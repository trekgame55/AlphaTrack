"use server";

import { api } from "@/lib/api";
import { getToken } from "./workspace";

export async function listProjects(workspaceId: string) {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api.projects.list(token, workspaceId);
  } catch {
    return [];
  }
}

export async function createProject(workspaceId: string, name: string, color: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const project = await api.projects.create(token, workspaceId, name, color);
    return { project };
  } catch (err: any) {
    return { error: err?.message ?? "Ошибка" };
  }
}

export async function deleteProject(projectId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.projects.delete(token, projectId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message ?? "Ошибка" };
  }
}
