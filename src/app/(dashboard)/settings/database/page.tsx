"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database, HardDrive, Download, Trash2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
  Archive, Server, Users, Briefcase, ListTodo,
  BookUser, Tag, MessageSquare, Clock,
} from "lucide-react";
import {
  getDbStats, listBackups, createBackup,
  deleteBackup, getDownloadUrl, getDbDownloadUrl, getSessionToken,
} from "@/actions/database";

type Stat = Awaited<ReturnType<typeof getDbStats>>;
type Backup = { name: string; sizeKb: number; createdAt: string };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STAT_CARDS = [
  { key: "users",      label: "Пользователи",  icon: Users },
  { key: "workspaces", label: "Команды",        icon: Server },
  { key: "members",    label: "Участники",      icon: Users },
  { key: "projects",   label: "Проекты",        icon: Briefcase },
  { key: "tasks",      label: "Задачи",         icon: ListTodo },
  { key: "contacts",   label: "Контакты",       icon: BookUser },
  { key: "tags",       label: "Теги",           icon: Tag },
  { key: "comments",   label: "Комментарии",    icon: MessageSquare },
] as const;

export default function DatabasePage() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [s, b] = await Promise.all([getDbStats(), listBackups()]);
    setStats(s as Stat);
    setBackups(b as Backup[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBackup = async () => {
    setBusy("backup");
    const res = await createBackup() as any;
    setBusy(null);
    if (res.success) { notify("ok", `Бекап создан: ${res.name}`); load(); }
    else notify("err", res.error || "Ошибка");
  };


  const handleDeleteBackup = async (name: string) => {
    if (!confirm(`Удалить бекап «${name}»?`)) return;
    setBusy("del-" + name);
    const res = await deleteBackup(name) as any;
    setBusy(null);
    if (res.success) { notify("ok", "Бекап удалён"); load(); }
    else notify("err", res.error || "Ошибка");
  };

  const handleDownloadDb = async () => {
    setBusy("download-db");
    const [url, token] = await Promise.all([getDbDownloadUrl(), getSessionToken()]);
    setBusy(null);
    const res = await fetch(url, { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) { notify("err", "Ошибка скачивания"); return; }
    downloadBlob(await res.blob(), "alphatrack.db");
  };

  const handleDownloadBackup = async (name: string) => {
    setBusy("dl-" + name);
    const [url, token] = await Promise.all([getDownloadUrl(name), getSessionToken()]);
    setBusy(null);
    const res = await fetch(url, { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) { notify("err", "Ошибка скачивания"); return; }
    downloadBlob(await res.blob(), name);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          toast.type === "ok" ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "bg-red-500/20 border border-red-500/40 text-red-400"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> База данных
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Управление, резервные копии и экспорт данных</p>
        </div>
        <button onClick={load} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-white hover:border-primary transition-colors" title="Обновить">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar px-4 md:px-6 lg:px-8 pb-8 flex flex-col gap-6">

        {/* Stats grid */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> Статистика
            {stats && <span className="ml-auto font-normal normal-case">{stats.fileSizeKb} KB на диске</span>}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAT_CARDS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="bg-[#111111] border border-border rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {loading ? "…" : String((stats as any)?.[key] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions row */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" /> Действия
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Create backup */}
            <button
              onClick={handleBackup}
              disabled={busy === "backup"}
              className="group flex items-start gap-3 p-4 bg-[#111111] border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                {busy === "backup" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Archive className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Создать бекап</p>
                <p className="text-xs text-muted-foreground mt-0.5">Сохранить текущий snapshot БД</p>
              </div>
            </button>

            {/* Download .db */}
            <button
              onClick={handleDownloadDb}
              disabled={busy === "download-db"}
              className="group flex items-start gap-3 p-4 bg-[#111111] border border-border rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                {busy === "download-db" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Скачать БД (.db)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Скачать SQLite файл напрямую</p>
              </div>
            </button>

          </div>
        </div>

        {/* Backups list */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5" /> Резервные копии ({backups.length})
          </h2>
          <div className="bg-[#111111] border border-border rounded-xl overflow-hidden">
            {backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Archive className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Нет резервных копий</p>
                <p className="text-xs mt-1">Нажмите «Создать бекап» чтобы создать первый</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Файл</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Дата</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Размер</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b, i) => (
                    <tr key={b.name} className={`border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-foreground font-mono text-xs truncate max-w-[200px]">{b.name}</span>
                          {i === 0 && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">последний</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(b.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs text-right hidden sm:table-cell">{b.sizeKb} KB</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownloadBackup(b.name)}
                            disabled={busy === "dl-" + b.name}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                            title="Скачать"
                          >
                            {busy === "dl-" + b.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(b.name)}
                            disabled={!!busy}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Удалить"
                          >
                            {busy === "del-" + b.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/80 leading-relaxed">
            <b className="text-amber-400">Рекомендация:</b> Создавайте бекапы регулярно перед важными изменениями. 
            Бекапы хранятся в папке <code className="bg-secondary px-1 rounded text-xs font-mono">backend/backups/</code> на сервере. 
            Файл <code className="bg-secondary px-1 rounded text-xs font-mono">.db</code> можно открыть в{" "}
            <a href="https://sqlitebrowser.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">DB Browser for SQLite</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
