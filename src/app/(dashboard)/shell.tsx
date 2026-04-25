"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { TeamGuard } from "@/components/team-guard";

export function DashboardShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useSwipeNavigation(pathname);

  return (
    <WorkspaceProvider userId={userId}>
      <TeamGuard>
        <div className="flex h-[100dvh] bg-background overflow-hidden text-foreground">
          {/* Sidebar — desktop only */}
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

          {/* Main content */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Topbar onMenuClick={() => setSidebarOpen(true)} />

            {/* Scrollable page area — extra padding-bottom on mobile for bottom nav */}
            <main className="flex-1 overflow-auto relative">
              <div className="absolute inset-0 p-3 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </TeamGuard>
    </WorkspaceProvider>
  );
}
