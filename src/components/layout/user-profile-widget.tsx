"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWorkspace } from "@/lib/workspace-context";
import { createTeamAction, renameWorkspaceAction, deleteWorkspaceAction, generateInviteLink } from "@/actions/workspace";
import { ChevronDown, Check, Plus, LogOut, Settings, Loader2, X, MoreVertical, Pencil, Trash2, UserPlus, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

type InviteRole = "admin" | "member" | "viewer";
const INVITE_ROLES: { value: InviteRole; label: string; hint: string }[] = [
  { value: "viewer", label: "Наблюдатель", hint: "Только чтение" },
  { value: "member", label: "Участник",    hint: "Может работать с задачами" },
  { value: "admin",  label: "Администратор", hint: "Управляет пространством" },
];

export function UserProfileWidget() {
  const { currentUser, workspace, userWorkspaces, switchWorkspace, refresh } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeMenu, setActiveMenu] = useState<{ id: string, name: string, x: number, y: number } | null>(null);
  const [newName, setNewName] = useState("");
  const [editWsId, setEditWsId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inviteWs, setInviteWs] = useState<{ id: string; name: string } | null>(null);
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const router = useRouter();

  // Render portals only after mount (SSR-safe)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!currentUser) return null;

  const portal = (node: React.ReactNode) =>
    mounted && typeof document !== "undefined" ? createPortal(node, document.body) : null;

  const handleCreate = async () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    if (editWsId) {
      const res = await renameWorkspaceAction(editWsId, newName.trim()) as any;
      if (res?.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }
      setEditWsId(null);
      setShowCreate(false);
      setNewName("");
      refresh();
    } else {
      const res = await createTeamAction(newName.trim()) as any;
      if (res?.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }
      if (res.workspace) {
        switchWorkspace(res.workspace.id);
        setIsOpen(false);
      }
      setShowCreate(false);
      setNewName("");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту команду?")) return;
    await deleteWorkspaceAction(id);
    if (workspace?.id === id) {
      localStorage.removeItem("alphatrack_active_ws");
      window.location.reload();
    } else {
      refresh();
    }
  };

  const openInvite = (id: string, name: string) => {
    setInviteWs({ id, name });
    setInviteRole("member");
    setInviteLink(null);
    setInviteError(null);
    setInviteCopied(false);
  };

  const generateLink = async () => {
    if (!inviteWs) return;
    setInviteLoading(true);
    setInviteError(null);
    const res = await generateInviteLink(inviteWs.id, inviteRole) as any;
    setInviteLoading(false);
    if (res?.error) { setInviteError(res.error); return; }
    // Build the link from the current origin so it works for any host the inviter is using.
    const link = res?.token
      ? `${window.location.origin}/invite/${res.token}`
      : (res?.link ?? "");
    setInviteLink(link);
    try { await navigator.clipboard.writeText(link); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); } catch {}
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); } catch {}
  };

  const logout = () => {
    document.cookie = "alphatrack_session=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <>
      {portal(showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{editWsId ? "Переименовать команду" : "Новая команда"}</h2>
              <button onClick={() => { setShowCreate(false); setEditWsId(null); setErrorMsg(null); }} className="text-muted-foreground hover:text-white transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setErrorMsg(null); }}
              placeholder="Название команды..."
              className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:border-primary outline-none transition-colors mb-3"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            {errorMsg && (
              <div className="mb-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {errorMsg}
              </div>
            )}
            <button
              disabled={!newName.trim() || isSubmitting}
              onClick={handleCreate}
              className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editWsId ? "Сохранить" : "Создать")}
            </button>
          </div>
        </div>
      ))}

      <div className="p-3 shrink-0 border-b border-border/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
        >
          <div className={`w-8 h-8 rounded-full ${currentUser.color || "bg-violet-500"} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
            {currentUser.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight group-hover:text-primary transition-colors">{currentUser.name}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{workspace?.name || "Нет команды"}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="mt-2 bg-[#1a1a1a] border border-border rounded-xl p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 fade-in duration-150">
            <div className="px-2 py-1.5 mb-1 border-b border-border/50">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ваши команды</span>
            </div>

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
              {userWorkspaces.map((ws) => (
                <div key={ws.id} className="relative group">
                  <button
                    onClick={() => { switchWorkspace(ws.id); setIsOpen(false); }}
                    className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-6">
                      <div className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {ws.name[0]?.toUpperCase()}
                      </div>
                      <span className={`truncate ${workspace?.id === ws.id ? "text-primary font-medium" : "text-foreground group-hover:text-white"}`}>
                        {ws.name}
                      </span>
                    </div>
                    {workspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-primary shrink-0 transition-transform duration-200 group-hover:-translate-x-[24px]" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveMenu({ id: ws.id, name: ws.name, x: rect.right, y: rect.bottom });
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setIsOpen(false); setShowCreate(true); }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors mt-1"
            >
              <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3" />
              </div>
              <span>Создать команду</span>
            </button>

            <div className="h-px bg-border/50 my-1" />

            <button className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Настройки профиля</span>
            </button>
            <button onClick={logout} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors">
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        )}
      </div>

      {portal(inviteWs && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInviteWs(null)}>
          <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-foreground">Пригласить в команду</h2>
              <button onClick={() => setInviteWs(null)} className="text-muted-foreground hover:text-white transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4 truncate">«{inviteWs.name}»</p>

            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Роль приглашённого</label>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {INVITE_ROLES.map(r => {
                const active = inviteRole === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => { setInviteRole(r.value); setInviteLink(null); }}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary/70"}`}
                  >
                    <div className={`text-[12px] font-semibold ${active ? "text-primary" : "text-foreground"}`}>{r.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{r.hint}</div>
                  </button>
                );
              })}
            </div>

            {inviteError && (
              <div className="mb-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {inviteError}
              </div>
            )}

            {inviteLink ? (
              <>
                <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-2 mb-3">
                  <span className="text-xs text-foreground font-mono truncate flex-1">{inviteLink}</span>
                  <button
                    onClick={copyInviteLink}
                    className="shrink-0 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                    title="Копировать"
                  >
                    {inviteCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Отправьте ссылку приглашённому. Чтобы принять приглашение, ему нужно зарегистрироваться или войти. Срок действия — 7 дней, ссылка одноразовая.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={generateLink}
                    disabled={inviteLoading}
                    className="flex-1 py-2 bg-secondary hover:bg-secondary/70 border border-border text-foreground text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    Сгенерировать новую
                  </button>
                  <button
                    onClick={() => setInviteWs(null)}
                    className="flex-1 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Готово
                  </button>
                </div>
              </>
            ) : (
              <button
                disabled={inviteLoading}
                onClick={generateLink}
                className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviteLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><UserPlus className="w-4 h-4" /> Создать ссылку-приглашение</>}
              </button>
            )}
          </div>
        </div>
      ))}

      {portal(activeMenu && (
        <div className="fixed inset-0 z-[110]" onClick={() => setActiveMenu(null)}>
          <div 
            className="fixed bg-[#222222] border border-border rounded-lg shadow-2xl p-1 w-40 flex flex-col"
            style={{ top: activeMenu.y, left: activeMenu.x - 160 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setNewName(activeMenu.name); setEditWsId(activeMenu.id); setShowCreate(true); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 text-foreground">
              <Pencil className="w-3 h-3" /> Переименовать
            </button>
            <button onClick={() => { openInvite(activeMenu.id, activeMenu.name); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 text-foreground">
              <UserPlus className="w-3 h-3" /> Пригласить
            </button>
            <button onClick={() => { handleDelete(activeMenu.id); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:bg-red-500/10 text-red-400 mt-1 border-t border-border/50">
              <Trash2 className="w-3 h-3" /> Удалить
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
