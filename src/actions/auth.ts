"use server";

import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";

const COOKIE = "alphatrack_session";

async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}


export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const r = await api.auth.checkEmail(email);
    return r.exists;
  } catch {
    return false;
  }
}

export async function loginUser(rawEmail: string, rawPassword: string) {
  try {
    const data = await api.auth.login(rawEmail.trim().toLowerCase(), rawPassword);
    const store = await cookies();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    store.set(COOKIE, data.token, {
      httpOnly: true,
      secure: false,
      expires,
      path: "/",
      sameSite: "lax",
    });
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { error: "Неверный email или пароль" };
      return { error: err.message };
    }
    return { error: "Ошибка сервера. Попробуйте позже." };
  }
}

export async function registerUser(rawName: string, rawEmail: string, rawPassword: string, inviteToken?: string) {
  if (!rawName?.trim())     return { error: "Введите ваше имя" };
  if (rawPassword.length < 6) return { error: "Пароль должен содержать минимум 6 символов" };

  try {
    const data = await api.auth.register(
      rawName.trim(),
      rawEmail.trim().toLowerCase(),
      rawPassword,
      inviteToken,
    );
    const store = await cookies();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    store.set(COOKIE, data.token, {
      httpOnly: true,
      secure: false,
      expires,
      path: "/",
      sameSite: "lax",
    });
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400) return { error: "Email уже зарегистрирован" };
      return { error: err.message };
    }
    return { error: "Ошибка при регистрации. Попробуйте позже." };
  }
}

export async function logoutUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    try { await api.auth.logout(token); } catch {}
  }
  store.delete(COOKIE);
  return { success: true };
}

export async function getCurrentUser() {
  const token = await getToken();
  if (!token) return null;
  try {
    const user = await api.auth.me(token);
    return user;
  } catch {
    return null;
  }
}



export { getToken };

export async function updateProfile(data: { name?: string; email?: string }) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  try {
    const user = await api.auth.updateProfile(token, data);
    return { user };
  } catch (err: any) {
    return { error: err?.message ?? "Не удалось обновить профиль" };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" };
  if (!currentPassword) return { error: "Введите текущий пароль" };
  if (newPassword.length < 6) return { error: "Минимум 6 символов" };
  try {
    await api.auth.changePassword(token, currentPassword, newPassword);
    return { success: true };
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 401) return { error: "Неверный текущий пароль" };
    return { error: err?.message ?? "Не удалось сменить пароль" };
  }
}
