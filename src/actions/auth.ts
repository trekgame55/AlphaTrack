"use server";

import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";

const COOKIE = "weeek_session";

async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

function setSessionCookie(token: string) {
  // fire-and-forget — used in login/register only
  cookies().then(store => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    store.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires,
      path: "/",
      sameSite: "lax",
    });
  });
}

// ─── Check email ──────────────────────────────────────────────────────────────

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const r = await api.auth.checkEmail(email);
    return r.exists;
  } catch {
    return false;
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(rawEmail: string, rawPassword: string) {
  try {
    const data = await api.auth.login(rawEmail.trim().toLowerCase(), rawPassword);
    const store = await cookies();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    store.set(COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
    console.error("[auth] loginUser error:", err);
    return { error: "Ошибка сервера. Попробуйте позже." };
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(rawName: string, rawEmail: string, rawPassword: string) {
  if (!rawName?.trim())     return { error: "Введите ваше имя" };
  if (rawPassword.length < 6) return { error: "Пароль должен содержать минимум 6 символов" };

  try {
    const data = await api.auth.register(
      rawName.trim(),
      rawEmail.trim().toLowerCase(),
      rawPassword,
    );
    const store = await cookies();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    store.set(COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
    console.error("[auth] registerUser error:", err);
    return { error: "Ошибка при регистрации. Попробуйте позже." };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    try { await api.auth.logout(token); } catch {}
  }
  store.delete(COOKIE);
  return { success: true };
}

// ─── Get current user (used by workspace context, middleware) ─────────────────

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

export async function updateProfileAction(data: { name?: string; password?: string; new_password?: string }) {
  const token = await getToken();
  if (!token) return { error: "Не авторизован" };
  try {
    await api.auth.updateProfile(token, data);
    return { success: true };
  } catch (err: any) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Ошибка при обновлении профиля" };
  }
}

export { getToken };
