"use client";

import { Menu, Filter, SlidersHorizontal, Bell, LogOut, List, Table2, CalendarDays, Kanban, Calendar } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@/actions/auth";

const PAGE_META: Record<string, { title: string; showViewSwitcher: boolean }> = {
  "/tasks":      { title: "Мои задачи",   showViewSwitcher: true  },
  "/projects":   { title: "Проекты",      showViewSwitcher: false },
  "/documents":  { title: "Документы",    showViewSwitcher: false },
  "/contacts":   { title: "Контакты",     showViewSwitcher: false },
  "/week":       { title: "Неделя",       showViewSwitcher: false },
  "/board":      { title: "Доска",        showViewSwitcher: false },
  "/templates":  { title: "Шаблоны",      showViewSwitcher: false },
  "/archive":    { title: "Архив",        showViewSwitcher: false },
  "/":           { title: "AlphaTrack",     showViewSwitcher: false },
};

function getPageMeta(pathname: string) {
  return PAGE_META[pathname] || { title: "Раздел", showViewSwitcher: false };
}

const VIEW_BUTTONS = [
  { label: "Список", icon: <List className="w-3.5 h-3.5" />,        href: "/tasks"     },
  { label: "Неделя", icon: <CalendarDays className="w-3.5 h-3.5" />, href: "/week"      },
  { label: "Доска",  icon: <Kanban className="w-3.5 h-3.5" />,       href: "/board"     },
];

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { title, showViewSwitcher } = getPageMeta(pathname);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-3 md:px-6 border-b border-border bg-background/95 backdrop-blur z-20">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-[19px] font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      {/* Right: view switcher + actions */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {/* View Switcher (desktop only, context-sensitive) */}
        {showViewSwitcher && (
          <div className="hidden md:flex bg-secondary p-1 rounded-[8px] items-center text-sm font-medium gap-0.5">
            {VIEW_BUTTONS.map((v) => {
              const active = pathname === v.href;
              return (
                <button
                  key={v.href}
                  onClick={() => router.push(v.href)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-[12px] font-medium ${
                    active
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v.icon}
                  {v.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Filter */}
        <button className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
          <Filter className="w-4 h-4" />
          <span className="hidden lg:inline">Фильтр</span>
        </button>

        {/* Settings */}
        <button className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden lg:inline">Вид</span>
        </button>

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Notifications */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Выйти"
          className="ml-2 w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white overflow-hidden flex items-center justify-center shadow-sm transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
