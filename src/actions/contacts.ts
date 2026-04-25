"use server";

import { api } from "@/lib/api";
import { getToken } from "./workspace";

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function listContacts(workspaceId: string) {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api.contacts.list(token, workspaceId);
  } catch { return []; }
}

export async function createContact(workspaceId: string, data: {
  firstName: string; lastName: string; company?: string;
  email?: string; color?: string;
  phones?: { label: string; number: string }[];
}) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const contact = await api.contacts.create(token, workspaceId, data);
    return { contact };
  } catch (err: any) {
    return { error: err?.message ?? "Ошибка создания контакта" };
  }
}

export async function updateContact(contactId: string, data: {
  firstName?: string; lastName?: string; company?: string;
  email?: string; phones?: { label: string; number: string }[];
}) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const contact = await api.contacts.update(token, contactId, data);
    return { contact };
  } catch (err: any) {
    return { error: err?.message };
  }
}

export async function deleteContact(contactId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    await api.contacts.delete(token, contactId);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message };
  }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function listTags(workspaceId: string) {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api.tags.list(token, workspaceId);
  } catch { return []; }
}

export async function createTag(workspaceId: string, label: string, color: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const tag = await api.tags.create(token, workspaceId, label, color);
    return { tag };
  } catch (err: any) {
    return { error: err?.message };
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
