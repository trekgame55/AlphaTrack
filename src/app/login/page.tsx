"use client";

import { useState, useEffect } from "react";
import { Mail, AlertCircle, ArrowLeft, Lock, Eye, EyeOff, User, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { checkEmailExists, loginUser, registerUser } from "@/actions/auth";

type Step = "email" | "login" | "register" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [emailErr, setEmailErr] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pw2Err, setPw2Err] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleCheckEmail = async () => {
    setEmailErr("");
    const trimmed = email.trim();
    if (!trimmed) { setEmailErr("Введите электронную почту"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailErr("Некорректный формат почты"); return; }

    setLoading(true);
    try {
      const exists = await checkEmailExists(trimmed);
      setStep(exists ? "login" : "register");
    } catch {
      setEmailErr("Ошибка сервера. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setPwErr(""); setErrorMsg("");
    if (!password) { setPwErr("Введите пароль"); return; }
    setLoading(true);
    try {
      const result = await loginUser(email.trim(), password);
      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.success) {
        setStep("success");
        setTimeout(() => router.push("/tasks"), 1200);
      }
    } catch {
      setErrorMsg("Ошибка сервера. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setNameErr(""); setPwErr(""); setPw2Err(""); setErrorMsg("");
    let ok = true;
    if (!name.trim()) { setNameErr("Введите ваше имя"); ok = false; }
    if (password.length < 6) { setPwErr("Минимум 6 символов"); ok = false; }
    if (password !== passwordConfirm) { setPw2Err("Пароли не совпадают"); ok = false; }
    if (!ok) return;
    setLoading(true);
    try {
      const result = await registerUser(name.trim(), email.trim(), password);
      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.success) {
        setStep("success");
        setTimeout(() => router.push("/tasks"), 1200);
      }
    } catch {
      setErrorMsg("Ошибка сервера. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const getStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };
  const ss = getStrength();
  const sPcts  = ["0%", "25%", "50%", "75%", "100%"];
  const sColor = ["transparent", "#f87171", "#fb923c", "#facc15", "#4ade80"];

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center p-4 sm:p-6 bg-background relative"
      style={{ backgroundImage: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
    >
      <div className="w-full max-w-[400px] bg-card border border-border rounded-2xl p-6 sm:p-9 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_48px_rgba(0,0,0,0.5)]">

        {/* ── Email step ── */}
        {step === "email" && (
          <div className="flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-7">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-white">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">FlowDesk</span>
            </div>

            <h1 className="text-[22px] font-bold tracking-tight mb-1.5">Вход или регистрация</h1>
            <p className="text-sm text-muted-foreground mb-7">Введите почту — мы определим что делать дальше</p>

            <div className="flex flex-col gap-4" suppressHydrationWarning>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted-foreground" htmlFor="email-input">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    id="email-input"
                    suppressHydrationWarning
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCheckEmail()}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`w-full bg-secondary border rounded-md text-sm py-2.5 pl-10 pr-3 outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/20 transition-all ${emailErr ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {emailErr && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{emailErr}
                  </p>
                )}
              </div>

              <button
                disabled={loading}
                onClick={handleCheckEmail}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-md text-sm h-[42px] flex items-center justify-center transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {loading
                  ? <div className="w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Продолжить"}
              </button>
            </div>

            <p className="text-center text-[13px] text-muted-foreground mt-5">
              Продолжая, вы соглашаетесь с{" "}
              <a href="#" className="text-primary font-medium hover:underline">условиями</a>
            </p>
          </div>
        )}

        {/* ── Login step ── */}
        {step === "login" && (
          <div className="flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
            <button
              onClick={() => { setStep("email"); setPwErr(""); setErrorMsg(""); }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[13px] mb-5 w-fit transition-colors"
            >
              <ArrowLeft className="w-[15px] h-[15px]" /> Назад
            </button>

            <h1 className="text-[22px] font-bold tracking-tight mb-1.5">С возвращением 👋</h1>
            <p className="text-sm text-muted-foreground mb-4">Введите пароль для входа</p>

            <div className="text-[13px] text-muted-foreground bg-secondary border border-border rounded-md px-3 py-2 mb-4 break-all">
              <strong className="text-foreground font-medium">{email}</strong>
            </div>

            <div className="flex flex-col gap-4" suppressHydrationWarning>
              {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/25 text-destructive rounded-md px-3 py-2.5 text-[13px] flex items-center gap-2">
                  <AlertTriangle className="w-[15px] h-[15px] shrink-0" />{errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted-foreground" htmlFor="pw-input">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    id="pw-input"
                    suppressHydrationWarning
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="Ваш пароль"
                    autoComplete="current-password"
                    className={`w-full bg-secondary border rounded-md text-sm py-2.5 pl-10 pr-9 outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/20 transition-all ${pwErr ? "border-destructive" : "border-border"}`}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwErr && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{pwErr}</p>}
              </div>

              <button
                disabled={loading}
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-md text-sm h-[42px] flex items-center justify-center transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? <div className="w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Войти"}
              </button>
            </div>
          </div>
        )}

        {/* ── Register step ── */}
        {step === "register" && (
          <div className="flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
            <button
              onClick={() => { setStep("email"); setNameErr(""); setPwErr(""); setPw2Err(""); setErrorMsg(""); }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[13px] mb-5 w-fit transition-colors"
            >
              <ArrowLeft className="w-[15px] h-[15px]" /> Назад
            </button>

            <h1 className="text-[22px] font-bold tracking-tight mb-1.5">Создать аккаунт</h1>
            <p className="text-sm text-muted-foreground mb-4">Заполните данные для регистрации</p>

            <div className="text-[13px] text-muted-foreground bg-secondary border border-border rounded-md px-3 py-2 mb-4 break-all">
              <strong className="text-foreground font-medium">{email}</strong>
            </div>

            <div className="flex flex-col gap-3.5" suppressHydrationWarning>
              {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/25 text-destructive rounded-md px-3 py-2.5 text-[13px] flex items-center gap-2">
                  <AlertTriangle className="w-[15px] h-[15px] shrink-0" />{errorMsg}
                </div>
              )}

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Имя</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    suppressHydrationWarning type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Иван Иванов" autoComplete="name"
                    className={`w-full bg-secondary border rounded-md text-sm py-2.5 pl-10 pr-3 outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/20 transition-all ${nameErr ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {nameErr && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{nameErr}</p>}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    suppressHydrationWarning type={showPw ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" autoComplete="new-password"
                    className={`w-full bg-secondary border rounded-md text-sm py-2.5 pl-10 pr-9 outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/20 transition-all ${pwErr ? "border-destructive" : "border-border"}`}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="h-[3px] bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: sPcts[ss], backgroundColor: sColor[ss] }} />
                  </div>
                )}
                {pwErr && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{pwErr}</p>}
              </div>

              {/* Confirm */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Повторите пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    suppressHydrationWarning type={showPw ? "text" : "password"} value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRegister()}
                    placeholder="Повторите пароль" autoComplete="new-password"
                    className={`w-full bg-secondary border rounded-md text-sm py-2.5 pl-10 pr-9 outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/20 transition-all ${pw2Err ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {pw2Err && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{pw2Err}</p>}
              </div>

              <button
                disabled={loading}
                onClick={handleRegister}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-md text-sm h-[42px] flex items-center justify-center mt-1 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? <div className="w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Зарегистрироваться"}
              </button>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 py-6">
            <div className="w-14 h-14 bg-green-400/10 rounded-full flex items-center justify-center mb-5 text-green-400">
              <CheckCircle2 strokeWidth={2.2} className="w-8 h-8" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight mb-2">Добро пожаловать!</h1>
            <p className="text-sm text-muted-foreground mb-6">Переходим в ваш workspace...</p>
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
