"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const API_URL = "http://127.0.0.1:8000/api";

export async function getTelegramStatus() {
  const cookieStore = cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return { connected: false };

  try {
    const res = await fetch(`${API_URL}/telegram/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { connected: false };
    return await res.json();
  } catch (error) {
    return { connected: false };
  }
}

export async function generateTelegramLinkToken() {
  const cookieStore = cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return { error: "Не авторизован" };

  try {
    const res = await fetch(`${API_URL}/telegram/link-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      return { error: data.detail || "Ошибка" };
    }
    return await res.json();
  } catch (error) {
    return { error: "Ошибка соединения" };
  }
}

export async function disconnectTelegram() {
  const cookieStore = cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return { error: "Не авторизован" };

  try {
    const res = await fetch(`${API_URL}/telegram/disconnect`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { error: "Ошибка" };
    
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: "Ошибка соединения" };
  }
}
