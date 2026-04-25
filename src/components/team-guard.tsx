"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import { createTeamAction } from "@/actions/workspace";
import { Users, Loader2 } from "lucide-react";

export function TeamGuard({ children }: { children: React.ReactNode }) {
  const { workspace, loading, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    await createTeamAction(name.trim());
    refresh();
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Создайте команду</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Чтобы начать работу, создавать задачи и документы, вам нужно создать команду (воркспейс).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Название команды</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Моя супер команда"
                className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim() && !isSubmitting) {
                    handleSubmit();
                  }
                }}
              />
            </div>
            <button
              disabled={!name.trim() || isSubmitting}
              onClick={handleSubmit}
              className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Продолжить"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
