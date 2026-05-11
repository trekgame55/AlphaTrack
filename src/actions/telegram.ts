"use server";

import { cookies } from "next/headers";

const API_URL = process.env.PYTHON_BACKEND_URL ?? "http://127.0.0.1:8000";
const COOKIE = "alphatrack_session";

async function getToken() {
    const store = await cookies();
    return store.get(COOKIE)?.value ?? null;
}

export async function getTelegramStatus() {
    const token = await getToken();
    if (!token) return { connected: false };

    try {
        const res = await fetch(`${API_URL}/api/telegram/status`, {
            headers: { "x-session-token": token },
            cache: "no-store",
        });
        if (!res.ok) return { connected: false };
        return await res.json();
    } catch {
        return { connected: false };
    }
}

export async function generateTelegramLinkToken() {
    const token = await getToken();
    if (!token) return { error: "Не авторизован" };

    try {
        const res = await fetch(`${API_URL}/api/telegram/link-token`, {
            method: "POST",
            headers: { "x-session-token": token },
        });
        if (!res.ok) {
            const data = await res.json();
            return { error: data.detail || "Ошибка" };
        }
        return await res.json();
    } catch {
        return { error: "Ошибка соединения" };
    }
}

export async function disconnectTelegram() {
    const token = await getToken();
    if (!token) return { error: "Не авторизован" };

    try {
        const res = await fetch(`${API_URL}/api/telegram/disconnect`, {
            method: "DELETE",
            headers: { "x-session-token": token },
        });
        if (!res.ok) return { error: "Ошибка" };
        return { success: true };
    } catch {
        return { error: "Ошибка соединения" };
    }
}
