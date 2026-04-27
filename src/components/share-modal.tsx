"use client";

import { useState } from "react";
import { X, Users, Shield } from "lucide-react";
import { DocAccessEntry, ROLE_META, ROLE_ORDER } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export interface ShareModalProps {
  title?: string;
  defaultAccess: "view" | "edit" | "none";
  accessList: DocAccessEntry[];
  onUpdate: (data: { title?: string; defaultAccess: "view" | "edit" | "none"; accessList: DocAccessEntry[] }) => void;
  onClose: () => void;
}

export function ShareModal({
  title: initTitle,
  defaultAccess: initDefault,
  accessList: initList,
  onUpdate,
  onClose,
}: ShareModalProps) {
  const [list, setList] = useState<DocAccessEntry[]>(initList || []);
  const [defaultAccess, setDefaultAccess] = useState(initDefault || "none");
  const [title, setTitle] = useState(initTitle ?? "");
  const members = useAppStore((s) => s.members);

  const upsert = (entry: DocAccessEntry) => {
    setList((prev) => {
      const idx = entry.kind === "member"
        ? prev.findIndex((e) => e.kind === "member" && e.memberId === entry.memberId)
        : prev.findIndex((e) => e.kind === "role" && e.role === entry.role);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  };

  const remove = (entry: DocAccessEntry) => {
    setList((prev) =>
      entry.kind === "member"
        ? prev.filter((e) => !(e.kind === "member" && e.memberId === entry.memberId))
        : prev.filter((e) => !(e.kind === "role" && e.role === entry.role))
    );
  };

  const save = () => {
    onUpdate({
      title: initTitle !== undefined ? title.trim() || initTitle : undefined,
      accessList: list,
      defaultAccess,
    });
    onClose();
  };

  const memberEntries = members.map((m) => {
    const ex = list.find((e) => e.kind === "member" && e.memberId === m.id);
    return { member: m, access: ex?.access };
  });

  const roleEntries = ROLE_ORDER.map((role) => {
    const ex = list.find((e) => e.kind === "role" && e.role === role);
    return { role, access: ex?.access };
  });

  const AccessSelect = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="bg-secondary/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
    >
      <option value="">Нет доступа</option>
      <option value="view">Просмотр</option>
      <option value="edit">Редактирование</option>
    </select>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Настройка доступа
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Title (only when editing a document) */}
          {initTitle !== undefined && (
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Название документа</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название..."
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Default access */}
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Доступ по умолчанию</p>
            <select
              value={defaultAccess}
              onChange={(e) => setDefaultAccess(e.target.value as any)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="none">Нет доступа</option>
              <option value="view">Просмотр</option>
              <option value="edit">Редактирование</option>
            </select>
            {defaultAccess === "none" && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Доступ будет только у владельца и явно добавленных участников.
              </p>
            )}
          </div>

          {/* By role */}
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> По роли
            </p>
            <div className="flex flex-col gap-1.5">
              {roleEntries.map(({ role, access }) => (
                <div key={role} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_META[role].color}`}>
                      {ROLE_META[role].label}
                    </span>
                  </div>
                  <AccessSelect
                    value={access}
                    onChange={(v) =>
                      v
                        ? upsert({ kind: "role", role, access: v as any })
                        : remove({ kind: "role", role, access: "none" })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* By member */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> По участнику
            </p>
            <div className="flex flex-col gap-1.5">
              {memberEntries.map(({ member, access }) => (
                <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full ${member.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                      {member.initials}
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <AccessSelect
                    value={access}
                    onChange={(v) =>
                      v
                        ? upsert({ kind: "member", memberId: member.id, access: v as any })
                        : remove({ kind: "member", memberId: member.id, access: "none" })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">
            Отмена
          </button>
          <button onClick={save} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
