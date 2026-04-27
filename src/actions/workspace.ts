"use server";

import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";

const COOKIE = "alphatrack_session";

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function getCurrentUser() {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api.auth.me(token);
  } catch {
    return null;
  }
}

// ─── Get workspace for current user ──────────────────────────────────────────

export async function getUserWorkspace(workspaceId?: string) {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api.workspaces.current(token, workspaceId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    console.error("[workspace] getUserWorkspace error:", err);
    return null;
  }
}

// ─── Get all user workspaces ─────────────────────────────────────────────────

export async function getUserWorkspaces() {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api.workspaces.listAll(token);
  } catch {
    return [];
  }
}

// ─── Create team/workspace ────────────────────────────────────────────────────

export async function createTeamAction(name: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  const trimmed = name?.trim();
  if (!trimmed) return { error: "Название не может быть пустым" };
  try {
    const workspace = await api.workspaces.create(token, trimmed);
    return { workspace };
  } catch (err: any) {
    return { error: err?.message ?? "Ошибка создания команды" };
  }
}

// ─── Generate invite link ────────────────────────────────────────────────────

export async function generateInviteLink(workspaceId: string, role: string = "viewer") {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const res = await api.workspaces.generateInvite(token, workspaceId, role);
    const base = process.env.NEXT_PUBLIC_URL || "http://localhost:4040";
    return { link: `${base}${res.link}`, token: res.token, role: res.role };
  } catch (err: any) {
    return { error: err?.message };
  }
}

// ─── Join workspace by invite token ──────────────────────────────────────────

export async function joinWorkspaceByToken(inviteToken: string) {
  const token = await getToken();
  if (!token) return { error: "Войдите в систему" };
  try {
    const res = await api.workspaces.acceptInvite(token, inviteToken);
    return { success: true, workspaceId: res.workspaceId };
  } catch (err: any) {
    return { error: err?.message ?? "Недействительная ссылка" };
  }
}

// ─── Get workspace members ────────────────────────────────────────────────────

export async function getWorkspaceMembers(workspaceId: string) {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api.workspaces.members(token, workspaceId);
  } catch {
    return [];
  }
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeMember(workspaceId: string, memberId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.workspaces.removeMember(token, workspaceId, memberId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message };
  }
}

// ─── Rename / leave / delete workspace ─────────────────────────────────────────

export async function renameWorkspaceAction(workspaceId: string, name: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  if (!name?.trim()) return { error: "Название не может быть пустым" };
  try {
    const res = await api.workspaces.rename(token, workspaceId, name.trim());
    return { success: true, name: res.name };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось переименовать" };
  }
}

export async function deleteWorkspaceAction(workspaceId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.workspaces.delete(token, workspaceId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось удалить" };
  }
}

export async function leaveWorkspaceAction(workspaceId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.workspaces.leave(token, workspaceId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось покинуть пространство" };
  }
}

// ─── Member role / Invites management ─────────────────────────────────────────

export async function updateMemberRoleAction(workspaceId: string, memberId: string, role: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const res = await api.workspaces.updateMemberRole(token, workspaceId, memberId, role);
    return { success: true, role: res.role };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось изменить роль" };
  }
}

export async function listInvitesAction(workspaceId: string) {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api.workspaces.listInvites(token, workspaceId);
  } catch {
    return [];
  }
}

export async function revokeInviteAction(workspaceId: string, inviteId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.workspaces.revokeInvite(token, workspaceId, inviteId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось отозвать инвайт" };
  }
}

export async function changeMemberRole(workspaceId: string, userId: string, role: string) {
  return { success: true }; // TODO: add PATCH /workspaces/{id}/members/{uid}/role
}

// ─── Role permissions ─────────────────────────────────────────────────────────

export async function getRolePermissionsAction(workspaceId: string) {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api.workspaces.getPermissions(token, workspaceId);
  } catch (err: any) {
    return null;
  }
}

export async function updateRolePermissionsAction(
  workspaceId: string,
  matrix: Record<string, Record<string, boolean>>,
) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const res = await api.workspaces.updatePermissions(token, workspaceId, matrix);
    return { success: true, matrix: res.matrix };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось сохранить права" };
  }
}
