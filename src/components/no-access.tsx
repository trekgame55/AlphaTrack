"use client";

import { ShieldAlert } from "lucide-react";

export function NoAccess({
  title = "Нет доступа",
  hint = "У вас нет прав на просмотр этого раздела. Обратитесь к администратору пространства.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md">{hint}</p>
    </div>
  );
}
