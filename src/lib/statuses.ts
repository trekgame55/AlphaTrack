"use client";

import { useEffect } from "react";
import { create } from "zustand";

// ─── Color palette (kept static so Tailwind doesn't purge classes) ────────────

export type StatusColor =
  | "slate" | "blue" | "amber" | "purple" | "emerald"
  | "red"   | "orange" | "pink" | "cyan"   | "teal"
  | "lime"  | "indigo" | "fuchsia" | "rose" | "yellow";

export type StatusColorClasses = {
  accent:  string;  // small dot bg
  bg:      string;  // soft bg
  text:    string;  // colored text
  borderL: string;  // left border (priority-style)
  borderR: string;  // right border (status-style)
  glow:    string;  // bottom glow strip on cards
};

export const STATUS_COLOR_CLASSES: Record<StatusColor, StatusColorClasses> = {
  slate:   { accent: "bg-slate-400",   bg: "bg-slate-400/10",   text: "text-slate-400",   borderL: "border-l-slate-400",   borderR: "border-r-slate-400",   glow: "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.7)]" },
  blue:    { accent: "bg-blue-400",    bg: "bg-blue-400/10",    text: "text-blue-400",    borderL: "border-l-blue-400",    borderR: "border-r-blue-400",    glow: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]" },
  amber:   { accent: "bg-amber-400",   bg: "bg-amber-400/10",   text: "text-amber-400",   borderL: "border-l-amber-400",   borderR: "border-r-amber-400",   glow: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.95)]" },
  purple:  { accent: "bg-purple-400",  bg: "bg-purple-400/10",  text: "text-purple-400",  borderL: "border-l-purple-400",  borderR: "border-r-purple-400",  glow: "bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.9)]" },
  emerald: { accent: "bg-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-400", borderL: "border-l-emerald-400", borderR: "border-r-emerald-400", glow: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" },
  red:     { accent: "bg-red-400",     bg: "bg-red-400/10",     text: "text-red-400",     borderL: "border-l-red-400",     borderR: "border-r-red-400",     glow: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.95)]" },
  orange:  { accent: "bg-orange-400",  bg: "bg-orange-400/10",  text: "text-orange-400",  borderL: "border-l-orange-400",  borderR: "border-r-orange-400",  glow: "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.95)]" },
  pink:    { accent: "bg-pink-400",    bg: "bg-pink-400/10",    text: "text-pink-400",    borderL: "border-l-pink-400",    borderR: "border-r-pink-400",    glow: "bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.95)]" },
  cyan:    { accent: "bg-cyan-400",    bg: "bg-cyan-400/10",    text: "text-cyan-400",    borderL: "border-l-cyan-400",    borderR: "border-r-cyan-400",    glow: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.95)]" },
  teal:    { accent: "bg-teal-400",    bg: "bg-teal-400/10",    text: "text-teal-400",    borderL: "border-l-teal-400",    borderR: "border-r-teal-400",    glow: "bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.95)]" },
  lime:    { accent: "bg-lime-400",    bg: "bg-lime-400/10",    text: "text-lime-400",    borderL: "border-l-lime-400",    borderR: "border-r-lime-400",    glow: "bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.95)]" },
  indigo:  { accent: "bg-indigo-400",  bg: "bg-indigo-400/10",  text: "text-indigo-400",  borderL: "border-l-indigo-400",  borderR: "border-r-indigo-400",  glow: "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.95)]" },
  fuchsia: { accent: "bg-fuchsia-400", bg: "bg-fuchsia-400/10", text: "text-fuchsia-400", borderL: "border-l-fuchsia-400", borderR: "border-r-fuchsia-400", glow: "bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.95)]" },
  rose:    { accent: "bg-rose-400",    bg: "bg-rose-400/10",    text: "text-rose-400",    borderL: "border-l-rose-400",    borderR: "border-r-rose-400",    glow: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.95)]" },
  yellow:  { accent: "bg-yellow-400",  bg: "bg-yellow-400/10",  text: "text-yellow-400",  borderL: "border-l-yellow-400",  borderR: "border-r-yellow-400",  glow: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.95)]" },
};

export const STATUS_COLOR_NAMES: { id: StatusColor; label: string }[] = [
  { id: "slate",   label: "Серый"     },
  { id: "blue",    label: "Синий"     },
  { id: "amber",   label: "Янтарный"  },
  { id: "purple",  label: "Фиолетовый"},
  { id: "emerald", label: "Зелёный"   },
  { id: "red",     label: "Красный"   },
  { id: "orange",  label: "Оранжевый" },
  { id: "pink",    label: "Розовый"   },
  { id: "cyan",    label: "Голубой"   },
  { id: "teal",    label: "Бирюзовый" },
  { id: "lime",    label: "Лайм"      },
  { id: "indigo",  label: "Индиго"    },
  { id: "fuchsia", label: "Фуксия"    },
  { id: "rose",    label: "Роза"      },
  { id: "yellow",  label: "Жёлтый"    },
];

// ─── Status meta ──────────────────────────────────────────────────────────────

export type StatusMeta = {
  id: string;
  label: string;
  color: StatusColor;
  builtin?: boolean;
};

export const BUILT_IN_STATUSES: StatusMeta[] = [
  { id: "backlog",     label: "Бэклог",   color: "slate",   builtin: true },
  { id: "todo",        label: "К работе", color: "blue",    builtin: true },
  { id: "in_progress", label: "В работе", color: "amber",   builtin: true },
  { id: "review",      label: "Ревью",    color: "purple",  builtin: true },
  { id: "done",        label: "Готово",   color: "emerald", builtin: true },
];

// ─── Persisted custom-status store (per workspace) ───────────────────────────
//
// Custom statuses, overrides and hidden built-ins live in localStorage and are
// keyed by workspace id so each team has its own kanban columns. The active
// workspace id is tracked under "alphatrack_active_ws" by WorkspaceProvider.

function activeWs(): string {
  if (typeof window === "undefined") return "global";
  return localStorage.getItem("alphatrack_active_ws") || "global";
}
function nsKey(base: string, wsId?: string): string {
  return `${base}:${wsId ?? activeWs()}`;
}

const LS_KEY       = "we:custom-statuses";
const LS_OVERRIDES = "we:status-overrides";
const LS_HIDDEN    = "we:status-hidden";

function loadCustom(wsId?: string): StatusMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(nsKey(LS_KEY, wsId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) => s && typeof s.id === "string" && typeof s.label === "string" && typeof s.color === "string",
    );
  } catch {
    return [];
  }
}

function saveCustom(list: StatusMeta[], wsId?: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(nsKey(LS_KEY, wsId), JSON.stringify(list)); } catch {}
}

// Overrides only apply to built-in statuses (custom ones store fields directly).
type StatusOverride = { label?: string; color?: StatusColor };

function loadOverrides(wsId?: string): Record<string, StatusOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(nsKey(LS_OVERRIDES, wsId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverrides(map: Record<string, StatusOverride>, wsId?: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(nsKey(LS_OVERRIDES, wsId), JSON.stringify(map)); } catch {}
}

function loadHidden(wsId?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(nsKey(LS_HIDDEN, wsId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}
function saveHidden(list: string[], wsId?: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(nsKey(LS_HIDDEN, wsId), JSON.stringify(list)); } catch {}
}

interface StatusStoreState {
  wsId: string | null;
  custom: StatusMeta[];
  overrides: Record<string, StatusOverride>;
  hidden: string[];
  hydrated: boolean;
  /** Hydrate (or re-hydrate when switching workspaces). Pass the active workspace id. */
  hydrate: (wsId?: string) => void;
  add: (label: string, color: StatusColor) => StatusMeta;
  rename: (id: string, label: string) => void;
  recolor: (id: string, color: StatusColor) => void;
  remove: (id: string) => void;
}

const isBuiltinId = (id: string) => BUILT_IN_STATUSES.some((s) => s.id === id);

export const useStatusStore = create<StatusStoreState>((set, get) => ({
  wsId: null,
  custom: [],
  overrides: {},
  hidden: [],
  hydrated: false,
  hydrate: (wsId) => {
    const id = wsId ?? activeWs();
    if (get().hydrated && get().wsId === id) return;
    if (typeof window !== "undefined") {
      // One-time migration: legacy un-namespaced keys → first workspace seen.
      try {
        const MIG = "we:status-migrated";
        if (!localStorage.getItem(MIG)) {
          const oldCustom    = localStorage.getItem(LS_KEY);
          const oldOverrides = localStorage.getItem(LS_OVERRIDES);
          const oldHidden    = localStorage.getItem(LS_HIDDEN);
          if (oldCustom    && !localStorage.getItem(nsKey(LS_KEY,       id))) localStorage.setItem(nsKey(LS_KEY,       id), oldCustom);
          if (oldOverrides && !localStorage.getItem(nsKey(LS_OVERRIDES, id))) localStorage.setItem(nsKey(LS_OVERRIDES, id), oldOverrides);
          if (oldHidden    && !localStorage.getItem(nsKey(LS_HIDDEN,    id))) localStorage.setItem(nsKey(LS_HIDDEN,    id), oldHidden);
          localStorage.removeItem(LS_KEY);
          localStorage.removeItem(LS_OVERRIDES);
          localStorage.removeItem(LS_HIDDEN);
          localStorage.setItem(MIG, "1");
        }
      } catch {}
    }
    set({
      wsId: id,
      custom: loadCustom(id),
      overrides: loadOverrides(id),
      hidden: loadHidden(id),
      hydrated: true,
    });
  },
  add: (label, color) => {
    const meta: StatusMeta = { id: `cs-${Date.now()}`, label: label.trim() || "Новый", color };
    const next = [...get().custom, meta];
    set({ custom: next });
    saveCustom(next, get().wsId ?? undefined);
    return meta;
  },
  rename: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const ws = get().wsId ?? undefined;
    if (isBuiltinId(id)) {
      const next = { ...get().overrides, [id]: { ...(get().overrides[id] ?? {}), label: trimmed } };
      set({ overrides: next });
      saveOverrides(next, ws);
    } else {
      const next = get().custom.map((s) => (s.id === id ? { ...s, label: trimmed } : s));
      set({ custom: next });
      saveCustom(next, ws);
    }
  },
  recolor: (id, color) => {
    const ws = get().wsId ?? undefined;
    if (isBuiltinId(id)) {
      const next = { ...get().overrides, [id]: { ...(get().overrides[id] ?? {}), color } };
      set({ overrides: next });
      saveOverrides(next, ws);
    } else {
      const next = get().custom.map((s) => (s.id === id ? { ...s, color } : s));
      set({ custom: next });
      saveCustom(next, ws);
    }
  },
  remove: (id) => {
    const ws = get().wsId ?? undefined;
    if (isBuiltinId(id)) {
      // Hide built-in instead of deleting (keeps id stable for migrations)
      const next = Array.from(new Set([...get().hidden, id]));
      set({ hidden: next });
      saveHidden(next, ws);
    } else {
      const next = get().custom.filter((s) => s.id !== id);
      set({ custom: next });
      saveCustom(next, ws);
    }
  },
}));

/** Apply overrides to built-in metadata (label / color). */
function applyOverride(meta: StatusMeta, ov: StatusOverride | undefined): StatusMeta {
  if (!ov) return meta;
  return {
    ...meta,
    label: ov.label ?? meta.label,
    color: ov.color ?? meta.color,
  };
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function useAllStatuses(): StatusMeta[] {
  const custom = useStatusStore((s) => s.custom);
  const overrides = useStatusStore((s) => s.overrides);
  const hidden = useStatusStore((s) => s.hidden);
  const wsId = useStatusStore((s) => s.wsId);
  const hydrate = useStatusStore((s) => s.hydrate);
  // Re-hydrate whenever the active workspace changes (or on first mount).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem("alphatrack_active_ws") || "global";
    if (current !== wsId) hydrate(current);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "alphatrack_active_ws") hydrate(e.newValue || "global");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [wsId, hydrate]);
  const hiddenSet = new Set(hidden);
  const builtIns = BUILT_IN_STATUSES.filter((s) => !hiddenSet.has(s.id)).map((s) => applyOverride(s, overrides[s.id]));
  const customs  = custom.map((s) => applyOverride(s, overrides[s.id]));
  return [...builtIns, ...customs];
}

/** Synchronous lookup that works on both server and client (custom + overrides only on client). */
export function getStatusMeta(id: string | undefined | null): StatusMeta | undefined {
  if (!id) return undefined;
  const overrides = typeof window !== "undefined" ? loadOverrides() : {};
  const builtin = BUILT_IN_STATUSES.find((s) => s.id === id);
  if (builtin) return applyOverride(builtin, overrides[id]);
  if (typeof window === "undefined") return undefined;
  const custom = loadCustom().find((s) => s.id === id);
  return custom ? applyOverride(custom, overrides[id]) : undefined;
}

export function statusClasses(id: string | undefined | null): StatusColorClasses | undefined {
  const meta = getStatusMeta(id);
  if (!meta) return undefined;
  return STATUS_COLOR_CLASSES[meta.color];
}
