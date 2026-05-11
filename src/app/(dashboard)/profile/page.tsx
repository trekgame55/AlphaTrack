"use client";

import { useWorkspace } from "@/lib/workspace-context";
import { useState, useEffect, FormEvent } from "react";
import { User, Lock, MessageCircle, Shield, Loader2 } from "lucide-react";
import { getTelegramStatus, generateTelegramLinkToken, disconnectTelegram } from "@/actions/telegram";
import { updateProfileAction } from "@/actions/auth";

export default function ProfilePage() {
  const { currentUser, refresh } = useWorkspace();
  
  const [name, setName] = useState(currentUser?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);

  const [tgStatus, setTgStatus] = useState<{ connected: boolean; username?: string } | null>(null);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [loadingTg, setLoadingTg] = useState(false);

  useEffect(() => {
    getTelegramStatus().then(setTgStatus);
  }, []);

  const handleConnectTg = async () => {
    setLoadingTg(true);
    const res = await generateTelegramLinkToken();
    if (res?.link) {
      setTgLink(res.link);
    }
    setLoadingTg(false);
  };

  const handleDisconnectTg = async () => {
    setLoadingTg(true);
    await disconnectTelegram();
    setTgStatus({ connected: false });
    setTgLink(null);
    setLoadingTg(false);
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentUser?.name) return;
    setIsSavingName(true);
    setNameMessage(null);
    const res = await updateProfileAction({ name: name.trim() });
    if (res.error) {
      setNameMessage({ text: res.error, type: "error" });
    } else {
      setNameMessage({ text: "Имя успешно обновлено", type: "success" });
      refresh();
      setTimeout(() => setNameMessage(null), 3000);
    }
    setIsSavingName(false);
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsSavingPassword(true);
    setPassMessage(null);
    const res = await updateProfileAction({ password: currentPassword, new_password: newPassword });
    if (res.error) {
      setPassMessage({ text: res.error, type: "error" });
    } else {
      setPassMessage({ text: "Пароль успешно обновлен", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPassMessage(null), 3000);
    }
    setIsSavingPassword(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Настройки профиля</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управляйте личными данными, безопасностью и уведомлениями
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <User className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-8 pb-8 custom-scrollbar space-y-8">
        
        {/* Profile Info */}
        <div className="max-w-4xl bg-[#111111] border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Личные данные</h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="w-full bg-secondary/20 border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-2">Email используется для входа и не может быть изменен</p>
            </div>
            
            <form onSubmit={handleSaveName}>
              <label className="block text-sm font-medium text-foreground mb-1.5">Имя / Никнейм</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:border-primary outline-none transition-colors"
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm">
                  {nameMessage && (
                    <span className={nameMessage.type === "error" ? "text-red-400" : "text-emerald-400"}>
                      {nameMessage.text}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSavingName || !name.trim() || name === currentUser?.name}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingName && <Loader2 className="w-4 h-4 animate-spin" />}
                  Сохранить имя
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security */}
        <div className="max-w-4xl bg-[#111111] border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Безопасность</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Текущий пароль</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:border-primary outline-none transition-colors"
                />
              </div>
              
              <div className="pt-2 flex items-center justify-between">
                <div className="text-sm">
                  {passMessage && (
                    <span className={passMessage.type === "error" ? "text-red-400" : "text-emerald-400"}>
                      {passMessage.text}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSavingPassword || !currentPassword || !newPassword}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Сменить пароль
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Telegram Integration */}
        <div className="max-w-4xl bg-[#111111] border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-[#0088cc]" />
            <h2 className="text-lg font-semibold text-foreground">Интеграция с Telegram</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-6">
              Получайте уведомления о новых задачах (например, когда вас назначают исполнителем) и изменениях статусов прямо в Telegram.
            </p>
            
            {!tgStatus ? (
              <div className="text-sm text-muted-foreground">Загрузка...</div>
            ) : tgStatus.connected ? (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0088cc]/20 text-[#0088cc] rounded-full flex items-center justify-center font-bold">
                    TG
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Подключено</div>
                    <div className="text-sm text-muted-foreground">@{tgStatus.username || "Пользователь"}</div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectTg}
                  disabled={loadingTg}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                >
                  Отключить
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleConnectTg}
                  disabled={loadingTg}
                  className="px-4 py-2 bg-[#0088cc] text-white hover:bg-[#0088cc]/90 rounded-md text-sm font-medium transition-colors"
                >
                  Подключить Telegram
                </button>
                
                {tgLink && (
                  <div className="mt-4 p-4 border border-border rounded-lg bg-secondary/30">
                    <p className="text-sm text-foreground mb-2 font-medium">Перейдите по ссылке для привязки аккаунта:</p>
                    <a 
                      href={tgLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#0088cc] text-sm break-all hover:underline"
                    >
                      {tgLink}
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ссылка действительна 15 минут
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
