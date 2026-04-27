"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, Users, Settings, Shield, Link2, Copy, Check,
  Trash2, UserPlus, Crown, Eye, AlertTriangle,
} from "lucide-react";
import {
  getWorkspaceMembers, removeMember, updateMemberRoleAction,
  renameWorkspaceAction, deleteWorkspaceAction, leaveWorkspaceAction,
  generateInviteLink, listInvitesAction, revokeInviteAction,
  getRolePermissionsAction, updateRolePermissionsAction,
} from "@/actions/workspace";
import { useWorkspace } from "@/lib/workspace-context";

type Tab = "general" | "members" | "roles";

const ROLES = [
  { value: "admin",   label: "Администратор", hint: "Может менять настройки и участников", icon: <Shield className="w-3.5 h-3.5" /> },
  { value: "member",  label: "Участник",       hint: "Создаёт и редактирует задачи",        icon: <Users  className="w-3.5 h-3.5" /> },
  { value: "viewer",  label: "Наблюдатель",    hint: "Только чтение",                       icon: <Eye    className="w-3.5 h-3.5" /> },
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin_plus: { label: "Владелец",      cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  admin:      { label: "Администратор", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  member:     { label: "Участник",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  viewer:     { label: "Наблюдатель",   cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

export function WorkspaceSettingsModal({
  workspaceId,
  workspaceName,
  onClose,
}: {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}) {
  const { workspace, refresh, switchWorkspace } = useWorkspace();
  const [tab, setTab] = useState<Tab>("general");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const ownerId = workspace?.ownerId;

  // ── General tab state
  const [name, setName] = useState(workspaceName);
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generalErr, setGeneralErr] = useState<string | null>(null);
  const [generalOk, setGeneralOk]   = useState<string | null>(null);

  // ── Members tab state
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (tab !== "members") return;
    let cancelled = false;
    setLoadingMembers(true);
    Promise.all([
      getWorkspaceMembers(workspaceId),
      listInvitesAction(workspaceId),
    ]).then(([m, inv]) => {
      if (cancelled) return;
      setMembers(m as any[]);
      setInvites(inv as any[]);
      setLoadingMembers(false);
    });
    return () => { cancelled = true; };
  }, [tab, workspaceId]);

  // ── General actions
  const saveName = async () => {
    if (!name.trim() || name.trim() === workspaceName) return;
    setSavingName(true); setGeneralErr(null); setGeneralOk(null);
    const res: any = await renameWorkspaceAction(workspaceId, name.trim());
    setSavingName(false);
    if (res?.error) setGeneralErr(res.error);
    else { setGeneralOk("Сохранено"); refresh(); setTimeout(() => setGeneralOk(null), 2000); }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить пространство «${workspaceName}» со всеми задачами?`)) return;
    setDeleting(true);
    const res: any = await deleteWorkspaceAction(workspaceId);
    setDeleting(false);
    if (res?.error) { setGeneralErr(res.error); return; }
    if (workspace?.id === workspaceId) {
      localStorage.removeItem("alphatrack_active_ws");
      window.location.reload();
    } else {
      refresh();
      onClose();
    }
  };

  const handleLeave = async () => {
    if (!confirm("Покинуть пространство?")) return;
    const res: any = await leaveWorkspaceAction(workspaceId);
    if (res?.error) { setGeneralErr(res.error); return; }
    if (workspace?.id === workspaceId) {
      localStorage.removeItem("alphatrack_active_ws");
      window.location.reload();
    } else {
      refresh();
      onClose();
    }
  };

  // ── Members actions
  const changeRole = async (memberId: string, role: string) => {
    const res: any = await updateMemberRoleAction(workspaceId, memberId, role);
    if (res?.success) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: res.role } : m));
      refresh();
    }
  };

  const kick = async (memberId: string, name: string) => {
    if (!confirm(`Удалить ${name} из команды?`)) return;
    const res: any = await removeMember(workspaceId, memberId);
    if (res?.success) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      refresh();
    }
  };

  const makeInvite = async () => {
    setInviteLoading(true); setInviteCopied(false);
    const res: any = await generateInviteLink(workspaceId, inviteRole);
    setInviteLoading(false);
    if (res?.error) return;
    const link = res.token ? `${window.location.origin}/invite/${res.token}` : (res.link ?? "");
    setInviteLink(link);
    try { await navigator.clipboard.writeText(link); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); } catch {}
    // Refresh invites list
    listInvitesAction(workspaceId).then(setInvites as any);
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); } catch {}
  };

  const revokeInvite = async (id: string) => {
    const res: any = await revokeInviteAction(workspaceId, id);
    if (res?.success) setInvites(prev => prev.filter(i => i.id !== id));
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#0f0f0f] border border-border rounded-2xl w-full max-w-3xl h-[90vh] sm:h-[600px] sm:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar tabs (left on desktop, top on mobile) */}
        <div className="sm:w-[200px] bg-[#0a0a0a] border-b sm:border-b-0 sm:border-r border-border/60 flex sm:flex-col p-2 sm:p-3 gap-1 shrink-0 overflow-x-auto sm:overflow-x-visible">
          <div className="hidden sm:block px-2 py-2 mb-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Пространство</div>
            <div className="text-sm font-medium text-foreground truncate">{workspaceName}</div>
          </div>
          <TabBtn active={tab === "general"} onClick={() => setTab("general")} icon={<Settings className="w-4 h-4" />} label="Общие" />
          <TabBtn active={tab === "members"} onClick={() => setTab("members")} icon={<Users    className="w-4 h-4" />} label="Участники" />
          <TabBtn active={tab === "roles"}   onClick={() => setTab("roles")}   icon={<Shield   className="w-4 h-4" />} label="Роли" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="h-12 flex items-center justify-between px-5 border-b border-border/60 shrink-0">
            <h2 className="text-sm font-semibold text-foreground">
              {tab === "general"  && "Общие настройки"}
              {tab === "members"  && "Участники команды"}
              {tab === "roles"    && "Роли и права"}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {tab === "general" && (
              <div className="flex flex-col gap-6 max-w-md">
                <Section title="Название" hint="Видно всем участникам команды">
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                    />
                    <button
                      disabled={savingName || !name.trim() || name.trim() === workspaceName}
                      onClick={saveName}
                      className="px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
                    </button>
                  </div>
                  {generalErr && <ErrorMsg>{generalErr}</ErrorMsg>}
                  {generalOk  && <div className="text-[12px] text-emerald-400 mt-1.5 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{generalOk}</div>}
                </Section>

                <Section title="Картинка пространства" hint="Скоро">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                      {workspaceName[0]?.toUpperCase()}
                    </div>
                    <button disabled className="px-3 py-2 bg-secondary/40 border border-border text-muted-foreground text-sm rounded-lg cursor-not-allowed">
                      Загрузить (скоро)
                    </button>
                  </div>
                </Section>

                <Section title="Опасная зона" hint="Эти действия нельзя отменить">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleLeave}
                      className="w-full text-left px-3 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <span>Покинуть пространство</span>
                      <span className="text-xs text-muted-foreground">→</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full text-left px-3 py-2.5 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-sm text-red-400 transition-colors flex items-center justify-between disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Удалить пространство</span>
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs">→</span>}
                    </button>
                  </div>
                </Section>
              </div>
            )}

            {tab === "members" && (
              <div className="flex flex-col gap-6">
                <Section title="Пригласить нового участника" hint="Создайте ссылку и отправьте получателю">
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ROLES.map(r => {
                        const active = inviteRole === r.value;
                        return (
                          <button
                            key={r.value}
                            onClick={() => { setInviteRole(r.value); setInviteLink(null); }}
                            className={`text-left px-3 py-2 rounded-lg border transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:bg-secondary/60"}`}
                          >
                            <div className={`text-[12px] font-semibold flex items-center gap-1.5 ${active ? "text-primary" : "text-foreground"}`}>{r.icon}{r.label}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{r.hint}</div>
                          </button>
                        );
                      })}
                    </div>

                    {inviteLink ? (
                      <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-3 py-2">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-foreground font-mono truncate flex-1">{inviteLink}</span>
                        <button onClick={copyInvite} className="shrink-0 text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                          {inviteCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : null}

                    <button
                      disabled={inviteLoading}
                      onClick={makeInvite}
                      className="w-full py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {inviteLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><UserPlus className="w-4 h-4" /> {inviteLink ? "Сгенерировать новую" : "Создать ссылку-приглашение"}</>}
                    </button>
                  </div>
                </Section>

                <Section title={`Активные участники ${members.length ? `(${members.length})` : ""}`}>
                  {loadingMembers && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Загрузка...</div>}
                  {!loadingMembers && members.length === 0 && <EmptyHint>Пока нет участников</EmptyHint>}
                  {!loadingMembers && members.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {members.map(m => {
                        const isOwner = m.userId === ownerId;
                        const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.member;
                        return (
                          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className={`w-9 h-9 rounded-full ${m.user.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {m.user.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                                {m.user.name}
                                {isOwner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">{m.user.email}</div>
                            </div>

                            {isOwner ? (
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            ) : (
                              <>
                                <select
                                  value={m.role}
                                  onChange={(e) => changeRole(m.id, e.target.value)}
                                  className="bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs text-foreground focus:border-primary outline-none cursor-pointer"
                                >
                                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                                <button
                                  onClick={() => kick(m.id, m.user.name)}
                                  title="Удалить из команды"
                                  className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>

                {invites.filter((i: any) => !i.usedAt).length > 0 && (
                  <Section title="Ожидающие приглашения">
                    <div className="flex flex-col gap-1">
                      {invites.filter((i: any) => !i.usedAt).map((i: any) => {
                        const badge = ROLE_BADGE[i.role] ?? ROLE_BADGE.member;
                        return (
                          <div key={i.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-secondary/20">
                            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-foreground font-mono truncate">{i.token.slice(0, 24)}...</div>
                              <div className="text-[10px] text-muted-foreground">
                                {i.expiresAt ? `Истекает ${new Date(i.expiresAt).toLocaleDateString()}` : "Бессрочно"}
                              </div>
                            </div>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <button
                              onClick={() => revokeInvite(i.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Отозвать"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {tab === "roles" && <RolesPermissionsPanel workspaceId={workspaceId} />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 sm:gap-2.5 shrink-0 sm:w-full text-left px-3 sm:px-2.5 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-[12px] font-semibold text-foreground uppercase tracking-wider">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-red-400 mt-1.5 flex items-center gap-1">
      <AlertTriangle className="w-3.5 h-3.5" />
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground py-3 text-center bg-secondary/20 rounded-lg border border-dashed border-border">{children}</div>;
}

// ── Permissions matrix ────────────────────────────────────────────────────

const PERM_GROUPS: { title: string; items: { key: string; label: string; hint?: string }[] }[] = [
  {
    title: "Задачи",
    items: [
      { key: "tasks.view",    label: "Видеть задачи",        hint: "Открывать страницу задач" },
      { key: "tasks.create",  label: "Создавать задачи" },
      { key: "tasks.edit",    label: "Редактировать задачи", hint: "Менять статус, описание, срок и т.д." },
      { key: "tasks.delete",  label: "Удалять задачи" },
      { key: "tasks.comment", label: "Комментировать" },
      { key: "tasks.attach",  label: "Прикреплять файлы" },
    ],
  },
  {
    title: "Документы",
    items: [
      { key: "documents.view",   label: "Видеть документы" },
      { key: "documents.create", label: "Создавать документы" },
      { key: "documents.edit",   label: "Редактировать документы" },
      { key: "documents.delete", label: "Удалять документы" },
    ],
  },
  {
    title: "Контакты и теги",
    items: [
      { key: "contacts.view",   label: "Видеть контакты" },
      { key: "contacts.manage", label: "Управлять контактами", hint: "Создание, редактирование, удаление" },
      { key: "tags.manage",     label: "Управлять тегами" },
    ],
  },
  {
    title: "Команда",
    items: [
      { key: "workspace.invite", label: "Приглашать участников" },
    ],
  },
];

const ROLE_HEADERS: { key: string; label: string; cls: string }[] = [
  { key: "member", label: "Участник",   cls: "text-emerald-400" },
  { key: "viewer", label: "Наблюдатель", cls: "text-zinc-400" },
];

function RolesPermissionsPanel({ workspaceId }: { workspaceId: string }) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRolePermissionsAction(workspaceId).then(res => {
      if (cancelled) return;
      if (res?.matrix) setMatrix(res.matrix);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const toggle = (role: string, key: string) => {
    setMatrix(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [role]: { ...prev[role], [key]: !prev[role]?.[key] },
      };
    });
  };

  const save = async () => {
    if (!matrix) return;
    setSaving(true); setError(null);
    const res: any = await updateRolePermissionsAction(workspaceId, matrix);
    setSaving(false);
    if (res?.error) setError(res.error);
    else { setSavedAt(Date.now()); setTimeout(() => setSavedAt(null), 2000); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка прав...
      </div>
    );
  }

  if (!matrix) {
    return <div className="text-sm text-red-400">Не удалось загрузить права</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-[12px] text-muted-foreground">
          Настройте, что могут делать <span className="text-emerald-400">участники</span> и <span className="text-zinc-300">наблюдатели</span>.
          Владелец и администраторы всегда имеют полный доступ.
        </div>
      </div>

      {/* Header — sticky role labels */}
      <div className="sticky top-0 bg-[#0f0f0f] z-10 flex items-center gap-2 pb-2 border-b border-border/60">
        <div className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Право</div>
        {ROLE_HEADERS.map(r => (
          <div key={r.key} className={`w-[76px] text-center text-[10px] font-semibold uppercase tracking-wide leading-tight ${r.cls}`}>
            {r.label}
          </div>
        ))}
      </div>

      {/* Permission groups */}
      <div className="flex flex-col gap-4">
        {PERM_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1 px-1">
              {group.title}
            </div>
            <div className="flex flex-col rounded-xl border border-border/40 overflow-hidden">
              {group.items.map((item, ii) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.02] ${ii > 0 ? "border-t border-border/30" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground text-[13px] leading-tight truncate">{item.label}</div>
                    {item.hint && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.hint}</div>}
                  </div>
                  {ROLE_HEADERS.map(r => {
                    const checked = Boolean(matrix[r.key]?.[item.key]);
                    return (
                      <div key={r.key} className="w-[76px] flex justify-center shrink-0">
                        <button
                          onClick={() => toggle(r.key, item.key)}
                          className={`w-9 h-5 rounded-full transition-colors relative box-border ${checked ? "bg-primary" : "bg-secondary border border-border"}`}
                          aria-pressed={checked}
                          title={`${r.label}: ${item.label}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border/40">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Сохранить права
        </button>
        {savedAt && <span className="text-[12px] text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Сохранено</span>}
      </div>

      <div className="text-[11px] text-muted-foreground">
        После сохранения участники увидят изменения при следующем обновлении страницы.
      </div>
    </div>
  );
}
