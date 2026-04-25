"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinWorkspaceByToken } from "@/actions/workspace";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function join() {
      const result = await joinWorkspaceByToken(params.token);
      if ("error" in result) {
        setStatus("error");
        setMessage(result.error as string);
      } else {
        setStatus("success");
        setTimeout(() => router.push("/tasks"), 1500);
      }
    }
    join();
  }, [params.token, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-primary">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">FlowDesk</h1>

        {status === "loading" && (
          <div>
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Присоединяемся к рабочему пространству...</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-foreground font-medium mb-1">Добро пожаловать!</p>
            <p className="text-muted-foreground text-sm">Перенаправление...</p>
          </div>
        )}

        {status === "error" && (
          <div>
            <p className="text-red-400 font-medium mb-1">Ошибка</p>
            <p className="text-muted-foreground text-sm mb-4">{message}</p>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Войти
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
