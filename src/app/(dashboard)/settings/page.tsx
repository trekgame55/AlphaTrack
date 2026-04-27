"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings2, Shield, User as UserIcon, Users, Link2, Building2,
  Save, Trash2, LogOut, Plus, Copy, Check, AlertTriangle, Info, X,
} from "lucide-react";

import { useAppStore } from "@/lib/store";
import { ROLE_ORDER, ROLE_META, RoleConfig, Role } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";
import {
  generateInviteLink, listInvitesAction, revokeInviteAction,
  updateMemberRoleAction, removeMember,
  renameWorkspaceAction, deleteWorkspaceAction, leaveWorkspaceAction,
} from "@/actions/workspace";
import { updateProfile, changePassword } from "@/actions/auth";
import type { InviteDTO } from "@/lib/api";

type Tab = "profile" | "workspace" | "members" | "invites" | "permissions";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile",     label: "Профиль",      icon: UserIcon },
  { id: "workspace",   label: "Пространство", icon: Building2 },
  { id: "members",     label: "Участники",    icon: Users },
  { id: "invites",     label: "Инвайты",      icon: Link2 },
  { id: "permissions", label: "Права",        icon: Shield },
];

const PERMISSION_LABELS: Record<keyof RoleConfig, string> = {
  canEditTask:      "Редактировать задачи",
  canCompleteTask:  "Завершать задачи",
  canManageMembers: "Управлять участниками",
  canChangeRoles:   "Изменять роли",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Настройки</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Профиль, пространство, участники и права доступа
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <Settings2 className="w-5 h-5" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 lg:px-8 mt-6 border-b border-border">
        <div className="flex gap-1 overflow-x-auto custom-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-8 py-6 custom-scrollbar">
        <div className="max-w-3xl">
          {tab === "profile"     && <ProfileTab />}
          {tab === "workspace"   && <WorkspaceTab />}
          {tab === "members"     && <MembersTab />}
          {tab === "invites"     && <InvitesTab />}
          {tab === "permissions" && <PermissionsTab />}
        </div>
      </div>
    </div>
  );
}

// ── Card helpers ──────────────────────────────────────────────────────────────

function Card({ title, description, children, danger }: {
  title: string; description?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <section className={`bg-[#111111] border rounded-xl mb-5 ${danger ? "border-red-500/30" : "border-border"}`}>
      <header className="px-5 py-4 border-b border-border">
        <h2 className={`text-base font-semibold ${danger ? "text-red-400" : "text-foreground"}`}>{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full bg-secondary border border-border rounded-md text-sm py-2 px-3 outline-none " +
        "placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/20 transition-all " +
        (props.className ?? "")
      }
    />
  );
}

function PrimaryButton({ loading, children, ...rest }: any) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-semibold transition disabled:opacity-50 inline-flex items-center gap-2"
    >
      {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
}

function DangerButton({ children, ...rest }: any) {
  return (
    <button
      {...rest}
      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-md text-sm font-semibold transition inline-flex items-center gap-2"
    >
      {children}
    </button>
  );
}

function Banner({ kind, children }: { kind: "ok" | "err" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "ok"  ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" :
    kind === "err" ? "bg-red-400/10 border-red-400/30 text-red-400" :
                     "bg-primary/10 border-primary/30 text-primary";
  const Icon = kind === "ok" ? Check : kind === "err" ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-md border text-sm ${cls}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { currentUser, refresh } = useWorkspace();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email, setEmail] = useState((currentUser as any)?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setName(currentUser?.name ?? "");
    setEmail((currentUser as any)?.email ?? "");
  }, [currentUser]);

  const onSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    const res = await updateProfile({ name, email });
    setSavingProfile(false);
    if ((res as any).error) setProfileMsg({ kind: "err", text: (res as any).error });
    else { setProfileMsg({ kind: "ok", text: "Профиль обновлён" }); refresh(); }
  };

  const onChangePw = async () => {
    setSavingPw(true);
    setPwMsg(null);
    const res = await changePassword(oldPw, newPw);
    setSavingPw(false);
    if ((res as any).error) setPwMsg({ kind: "err", text: (res as any).error });
    else { setPwMsg({ kind: "ok", text: "Пароль изменён" }); setOldPw(""); setNewPw(""); }
  };

  return (
    <>
      <Card title="Личные данные" description="Как вас будут видеть другие участники">
        <div className="grid gap-4">
          <div>
            <FieldLabel>Имя</FieldLabel>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
          </div>
          {profileMsg && <Banner kind={profileMsg.kind}>{profileMsg.text}</Banner>}
          <div>
            <PrimaryButton loading={savingProfile} onClick={onSaveProfile}>
              <Save className="w-4 h-4" /> Сохранить
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card title="Сменить пароль">
        <div className="grid gap-4">
          <div>
            <FieldLabel>Текущий пароль</FieldLabel>
            <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <FieldLabel>Новый пароль (минимум 6 символов)</FieldLabel>
            <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
          </div>
          {pwMsg && <Banner kind={pwMsg.kind}>{pwMsg.text}</Banner>}
          <div>
            <PrimaryButton loading={savingPw} onClick={onChangePw}>
              <Save className="w-4 h-4" /> Сменить пароль
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </>
  );
}

// ── Workspace tab ─────────────────────────────────────────────────────────────

function WorkspaceTab() {
  const { workspace, currentUser, myRole, refresh } = useWorkspace();
  const router = useRouter();
  const isOwner = workspace?.ownerId === (currentUser as any)?.id;

  const [name, setName] = useState(workspace?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave,  setConfirmLeave]  = useState(false);

  useEffect(() => { setName(workspace?.name ?? ""); }, [workspace?.id, workspace?.name]);

  const onRename = async () => {
    if (!workspace) return;
    setSaving(true); setMsg(null);
    const res = await renameWorkspaceAction(workspace.id, name);
    setSaving(false);
    if ((res as any).error) setMsg({ kind: "err", text: (res as any).error });
    else { setMsg({ kind: "ok", text: "Название обновлено" }); refresh(); }
  };

  const onDelete = async () => {
    if (!workspace) return;
    const res = await deleteWorkspaceAction(workspace.id);
    if ((res as any).error) setMsg({ kind: "err", text: (res as any).error });
    else { router.refresh(); window.location.href = "/tasks"; }
  };

  const onLeave = async () => {
    if (!workspace) return;
    const res = await leaveWorkspaceAction(workspace.id);
    if ((res as any).error) setMsg({ kind: "err", text: (res as any).error });
    else { window.location.href = "/tasks"; }
  };

  if (!workspace) return <Banner kind="info">Нет активного пространства</Banner>;

  const canManage = myRole === "admin_plus" || myRole === "admin";

  return (
    <>
      <Card title="Информация о пространстве">
        <div className="grid gap-4">
          <div>
            <FieldLabel>Название</FieldLabel>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={!canManage} />
          </div>
          <div>
            <FieldLabel>Идентификатор</FieldLabel>
            <Input value={workspace.id} readOnly className="font-mono text-xs opacity-70" />
          </div>
          {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
          {canManage && (
            <div>
              <PrimaryButton loading={saving} onClick={onRename}>
                <Save className="w-4 h-4" /> Сохранить
              </PrimaryButton>
            </div>
          )}
        </div>
      </Card>

      <Card title="Опасная зона" danger>
        <div className="space-y-4">
          {!isOwner && (
            <>
              <p className="text-sm text-muted-foreground">Покинуть пространство — вы потеряете доступ ко всем задачам и документам в нём.</p>
              {confirmLeave ? (
                <div className="flex gap-2">
                  <DangerButton onClick={onLeave}><LogOut className="w-4 h-4" /> Подтвердить выход</DangerButton>
                  <button onClick={() => setConfirmLeave(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Отмена</button>
                </div>
              ) : (
                <DangerButton onClick={() => setConfirmLeave(true)}><LogOut className="w-4 h-4" /> Покинуть пространство</DangerButton>
              )}
            </>
          )}
          {isOwner && (
            <>
              <p className="text-sm text-muted-foreground">Удалить пространство — действие необратимо. Все задачи, документы, контакты и инвайты будут удалены.</p>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <DangerButton onClick={onDelete}><Trash2 className="w-4 h-4" /> Подтвердить удаление</DangerButton>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Отмена</button>
                </div>
              ) : (
                <DangerButton onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4" /> Удалить пространство</DangerButton>
              )}
            </>
          )}
        </div>
      </Card>
    </>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab() {
  const { workspace, currentUser, myRole, refresh } = useWorkspace();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!workspace) return <Banner kind="info">Нет активного пространства</Banner>;
  const canManage = myRole === "admin_plus" || myRole === "admin";

  const onRoleChange = async (memberId: string, role: string) => {
    setBusy(memberId); setErr(null);
    const res = await updateMemberRoleAction(workspace.id, memberId, role);
    setBusy(null);
    if ((res as any).error) setErr((res as any).error);
    refresh();
  };

  const onRemove = async (memberId: string) => {
    if (!confirm("Удалить участника из пространства?")) return;
    setBusy(memberId); setErr(null);
    const res = await removeMember(workspace.id, memberId);
    setBusy(null);
    if ((res as any).error) setErr((res as any).error);
    refresh();
  };

  return (
    <Card title={`Участники (${workspace.members.length})`} description="Список всех людей в пространстве">
      {err && <div className="mb-3"><Banner kind="err">{err}</Banner></div>}
      <div className="divide-y divide-border">
        {workspace.members.map(m => {
          const isOwner = workspace.ownerId === m.userId;
          const isMe = m.userId === (currentUser as any)?.id;
          return (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${m.user.color}`}>
                  {m.user.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {m.user.name} {isMe && <span className="text-muted-foreground text-xs">(вы)</span>}
                    {isOwner && <span className="ml-2 text-[10px] uppercase text-amber-400">Владелец</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManage && !isOwner ? (
                  <select
                    value={m.role}
                    disabled={busy === m.id}
                    onChange={e => onRoleChange(m.id, e.target.value)}
                    className="bg-secondary border border-border rounded-md text-xs py-1.5 px-2 outline-none focus:border-primary/50"
                  >
                    {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                  </select>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_META[m.role as Role]?.color ?? ""}`}>
                    {ROLE_META[m.role as Role]?.label ?? m.role}
                  </span>
                )}
                {canManage && !isOwner && !isMe && (
                  <button
                    onClick={() => onRemove(m.id)}
                    disabled={busy === m.id}
                    className="w-7 h-7 rounded-md text-muted-foreground hover:bg-red-400/10 hover:text-red-400 transition flex items-center justify-center"
                    title="Удалить"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Invites tab ───────────────────────────────────────────────────────────────

function InvitesTab() {
  const { workspace, myRole } = useWorkspace();
  const [invites, setInvites] = useState<InviteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("viewer");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!workspace) return;
    setLoading(true);
    const data = await listInvitesAction(workspace.id);
    setInvites(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  if (!workspace) return <Banner kind="info">Нет активного пространства</Banner>;
  if (myRole !== "admin_plus" && myRole !== "admin") {
    return <Banner kind="info">Только администраторы могут управлять инвайтами</Banner>;
  }

  const onGenerate = async () => {
    setGenerating(true); setErr(null);
    const res = await generateInviteLink(workspace.id, role) as any;
    setGenerating(false);
    if (res.error) { setErr(res.error); return; }
    setGeneratedLink(res.link);
    try { await navigator.clipboard.writeText(res.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    load();
  };

  const onRevoke = async (id: string) => {
    if (!confirm("Отозвать инвайт?")) return;
    const res = await revokeInviteAction(workspace.id, id) as any;
    if (res.error) setErr(res.error);
    load();
  };

  const onCopy = async (link: string) => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <Card title="Создать новый инвайт" description="Сгенерируйте ссылку и отправьте её приглашённому">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full">
            <FieldLabel>Роль приглашённого</FieldLabel>
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full bg-secondary border border-border rounded-md text-sm py-2 px-3 outline-none focus:border-primary/50"
            >
              {ROLE_ORDER.filter(r => r !== "admin_plus").map(r => (
                <option key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].description}</option>
              ))}
            </select>
          </div>
          <PrimaryButton loading={generating} onClick={onGenerate}>
            <Plus className="w-4 h-4" /> Сгенерировать
          </PrimaryButton>
        </div>
        {err && <div className="mt-3"><Banner kind="err">{err}</Banner></div>}
        {generatedLink && (
          <div className="mt-4 flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-2">
            <span className="text-xs text-foreground font-mono truncate flex-1">{generatedLink}</span>
            <button
              onClick={() => onCopy(generatedLink)}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
              title="Копировать"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </Card>

      <Card title={`Активные инвайты (${invites.length})`}>
        {loading ? (
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-muted-foreground">Пока нет инвайтов</div>
        ) : (
          <div className="divide-y divide-border">
            {invites.map(inv => {
              const expired = inv.expiresAt ? new Date(inv.expiresAt) < new Date() : false;
              const used = !!inv.usedAt;
              const link = `${baseUrl}/invite/${inv.token}`;
              return (
                <div key={inv.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_META[inv.role as Role]?.color ?? ""}`}>
                        {ROLE_META[inv.role as Role]?.label ?? inv.role}
                      </span>
                      {used &&    <span className="text-[10px] uppercase text-muted-foreground">Использован</span>}
                      {expired && <span className="text-[10px] uppercase text-amber-400">Истёк</span>}
                      {!used && !expired && <span className="text-[10px] uppercase text-emerald-400">Активен</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 truncate">{link}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Истекает: {inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onCopy(link)}
                      className="p-2 rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
                      title="Копировать ссылку"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRevoke(inv.id)}
                      className="p-2 rounded-md text-muted-foreground hover:bg-red-400/10 hover:text-red-400 transition"
                      title="Отозвать"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

// ── Permissions tab (existing matrix) ─────────────────────────────────────────

function PermissionsTab() {
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const updateRolePermissions = useAppStore((s) => s.updateRolePermissions);

  return (
    <Card title="Матрица прав" description="Глобальные права для каждой роли. Владелец (Администратор+) имеет полный доступ.">
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="py-3 px-4 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Право / Действие
              </th>
              {ROLE_ORDER.map((role) => (
                <th key={role} className="py-3 px-4 border-b border-border min-w-[140px]">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium w-fit ${ROLE_META[role].color}`}>
                    {ROLE_META[role].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(PERMISSION_LABELS) as (keyof RoleConfig)[]).map((perm) => (
              <tr key={perm} className="hover:bg-white/[0.02] transition border-b border-border/50 last:border-0">
                <td className="py-3 px-4 text-sm font-medium text-foreground">{PERMISSION_LABELS[perm]}</td>
                {ROLE_ORDER.map((role) => {
                  const isOwner = role === "admin_plus";
                  const checked = rolePermissions[role]?.[perm] ?? false;
                  return (
                    <td key={`${role}-${perm}`} className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isOwner}
                        onChange={(e) => updateRolePermissions(role, { [perm]: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary/50 disabled:opacity-40"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
