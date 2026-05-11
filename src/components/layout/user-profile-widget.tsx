"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import { createTeamAction, renameWorkspaceAction, deleteWorkspaceAction, generateInviteLink } from "@/actions/workspace";
import { ChevronUp, Check, Plus, LogOut, Settings, Loader2, X, MoreVertical, Pencil, Trash2, UserPlus, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserProfileWidget() {
  const { currentUser, workspace, userWorkspaces, switchWorkspace, refresh } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeMenu, setActiveMenu] = useState<{ id: string, name: string, x: number, y: number } | null>(null);
  const [newName, setNewName] = useState("");
  const [editWsId, setEditWsId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const router = useRouter();

  if (!currentUser) return null;

  const handleCreate = async () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    if (editWsId) {
      await renameWorkspaceAction(editWsId, newName.trim());
      setEditWsId(null);
      refresh();
    } else {
      const res = await createTeamAction(newName.trim());
      if (res.workspace) {
        switchWorkspace(res.workspace.id);
        setIsOpen(false);
      }
    }
    setShowCreate(false);
    setNewName("");
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту команду?")) return;
    await deleteWorkspaceAction(id);
    if (workspace?.id === id) {
      localStorage.removeItem("weeek_active_ws");
      window.location.reload();
    } else {
      refresh();
    }
  };

  const handleInvite = async (id: string) => {
    const res = await generateInviteLink(id) as any;
    if (res.link) {
      navigator.clipboard.writeText(res.link);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const logout = () => {
    document.cookie = "weeek_session=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <>
      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{editWsId ? "Переименовать команду" : "Новая команда"}</h2>
              <button onClick={() => { setShowCreate(false); setEditWsId(null); }} className="text-muted-foreground hover:text-white transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название команды..."
              className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:border-primary outline-none transition-colors mb-4"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <button
              disabled={!newName.trim() || isSubmitting}
              onClick={handleCreate}
              className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editWsId ? "Сохранить" : "Создать")}
            </button>
          </div>
        </div>
      )}

      <div className="relative p-3 shrink-0 mt-auto border-t border-border/50">
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-3 w-[220px] mt-2 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1">
              <div className="px-2 py-1.5 mb-1 border-b border-border/50">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ваши команды</span>
              </div>
              
              <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
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

              <button onClick={() => { setIsOpen(false); router.push("/profile"); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                <Settings className="w-4 h-4" />
                <span>Настройки профиля</span>
              </button>
              <button onClick={logout} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors">
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </div>
          </>
        )}

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
          <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {activeMenu && (
        <div className="fixed inset-0 z-[110]" onClick={() => setActiveMenu(null)}>
          <div 
            className="fixed bg-[#222222] border border-border rounded-lg shadow-2xl p-1 w-40 flex flex-col"
            style={{ top: activeMenu.y, left: activeMenu.x - 160 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setNewName(activeMenu.name); setEditWsId(activeMenu.id); setShowCreate(true); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 text-foreground">
              <Pencil className="w-3 h-3" /> Переименовать
            </button>
            <button onClick={() => { handleInvite(activeMenu.id); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 text-foreground">
              {copiedLink === activeMenu.id ? <Link2 className="w-3 h-3 text-emerald-400" /> : <UserPlus className="w-3 h-3" />}
              {copiedLink === activeMenu.id ? "Скопировано!" : "Пригласить"}
            </button>
            <button onClick={() => { handleDelete(activeMenu.id); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:bg-red-500/10 text-red-400 mt-1 border-t border-border/50">
              <Trash2 className="w-3 h-3" /> Удалить
            </button>
          </div>
        </div>
      )}
    </>
  );
}
