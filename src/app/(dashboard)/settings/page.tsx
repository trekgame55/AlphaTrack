"use client";

import { useAppStore } from "@/lib/store";
import { ROLE_ORDER, ROLE_META, RoleConfig, Role } from "@/lib/mock-data";
import { Shield, Settings2, Info } from "lucide-react";

const PERMISSION_LABELS: Record<keyof RoleConfig, string> = {
  canEditTask: "Редактировать задачи",
  canCompleteTask: "Завершать задачи",
  canManageMembers: "Управлять участниками",
  canChangeRoles: "Изменять роли",
};

export default function SettingsPage() {
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const updateRolePermissions = useAppStore((s) => s.updateRolePermissions);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Настройки организации</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управляйте глобальными ролями и правами доступа в вашем воркспейсе
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <Settings2 className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-8 pb-8 custom-scrollbar">
        <div className="max-w-4xl bg-[#111111] border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Матрица прав доступа</h2>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 leading-relaxed">
                Здесь вы настраиваете <b>глобальные права</b> для каждой роли. 
                Владелец (Администратор+) имеет полный доступ ко всем функциям. 
                Читатель обычно имеет доступ только на чтение, но вы можете гибко настроить эти параметры.
              </p>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Право / Действие
                    </th>
                    {ROLE_ORDER.map((role) => (
                      <th key={role} className="py-3 px-4 border-b border-border min-w-[140px]">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium w-fit ${ROLE_META[role].color}`}>
                            {ROLE_META[role].label}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PERMISSION_LABELS) as (keyof RoleConfig)[]).map((perm) => (
                    <tr key={perm} className="group hover:bg-white/[0.02] transition-colors border-b border-border/50 last:border-0">
                      <td className="py-4 px-4 text-sm font-medium text-foreground">
                        {PERMISSION_LABELS[perm]}
                      </td>
                      {ROLE_ORDER.map((role) => {
                        const isOwner = role === "admin_plus";
                        const checked = rolePermissions[role]?.[perm] ?? false;
                        return (
                          <td key={`${role}-${perm}`} className="py-4 px-4">
                            <label className={`flex items-center gap-2 cursor-pointer ${isOwner ? "opacity-50" : ""}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isOwner}
                                onChange={(e) => {
                                  updateRolePermissions(role, { [perm]: e.target.checked });
                                }}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary/50"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
