"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2, ListTodo, CalendarDays, Kanban, BookUser,
  FileText, MoreHorizontal, Settings2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/tasks",     icon: CheckCircle2, label: "Задачи"   },
  { href: "/all-tasks", icon: ListTodo,     label: "Все"      },
  { href: "/week",      icon: CalendarDays, label: "Неделя"   },
  { href: "/board",     icon: Kanban,       label: "Доска"    },
  { href: "/contacts",  icon: BookUser,     label: "Контакты" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-colors ${active ? "bg-primary/15" : ""}`}>
                <Icon className="w-[22px] h-[22px]" />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
