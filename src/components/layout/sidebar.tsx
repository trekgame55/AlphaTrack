"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2, ListTodo, Briefcase, FileText,
  LayoutTemplate, Archive, Plus, UserPlus, X, CalendarDays,
  Calendar, Kanban, BookUser, Link2, Settings2, DatabaseZap,
} from "lucide-react";
import { generateInviteLink } from "@/actions/workspace";
import { useWorkspace, usePermission } from "@/lib/workspace-context";
import { useState } from "react";
import { UserProfileWidget } from "./user-profile-widget";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const canTasks     = usePermission("tasks.view");
  const canDocuments = usePermission("documents.view");
  const canContacts  = usePermission("contacts.view");

  const mainLinks = [
    canTasks     && { name: "Мои задачи",   href: "/tasks",      icon: <CheckCircle2  className="w-[18px] h-[18px]" /> },
    canDocuments && { name: "Документы",    href: "/documents",  icon: <FileText      className="w-[18px] h-[18px]" /> },
    canContacts  && { name: "Контакты",     href: "/contacts",   icon: <BookUser      className="w-[18px] h-[18px]" /> },
  ].filter(Boolean) as { name: string; href: string; icon: React.ReactNode }[];

  const planningLinks = [
    canTasks && { name: "Неделя",       href: "/week",       icon: <CalendarDays  className="w-[18px] h-[18px]" /> },
    canTasks && { name: "Доска",        href: "/board",      icon: <Kanban        className="w-[18px] h-[18px]" /> },
  ].filter(Boolean) as { name: string; href: string; icon: React.ReactNode }[];

  // /templates and /archive pages don't exist yet — hiding links to avoid 404s
  const otherLinks: { name: string; href: string; icon: React.ReactNode }[] = [];

  const renderLink = (link: { name: string; href: string; icon: React.ReactNode }) => {
    const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
    return (
      <Link
        key={link.name}
        href={link.href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
          active ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"
        }`}
      >
        <span className={`${active ? "text-primary" : "opacity-80"}`}>{link.icon}</span>
        {link.name}
      </Link>
    );
  };

  const handleInvite = async () => {
    if (!workspace) return;
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    const res = await generateInviteLink(workspace.id) as any;
    if (res.link) {
      setInviteLink(res.link);
      navigator.clipboard.writeText(res.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-[#111111] border-r border-border md:relative overflow-hidden flex flex-col transform transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0 mt-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary-foreground">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight text-white group-hover:text-primary transition-colors leading-none">AlphaTrack</span>
              {workspace && <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{workspace.name}</span>}
            </div>
          </Link>
          <button className="md:hidden text-muted-foreground hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User profile (top, expands downward inline) */}
        <UserProfileWidget />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-5 custom-scrollbar">
          {/* Main */}
          <div className="flex flex-col gap-0.5">
            {mainLinks.map(renderLink)}
          </div>

          {/* Planning */}
          <div className="flex flex-col gap-1">
            <div className="px-2.5 py-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Планирование</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {planningLinks.map(renderLink)}
            </div>
          </div>

          {/* Other */}
          <div className="flex flex-col gap-0.5">
            {otherLinks.map(renderLink)}
          </div>
        </div>

      </aside>
    </>
  );
}
