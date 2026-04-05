"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { NavProgressProvider } from "./nav-progress";
import type { StaffSession } from "@/types";

interface DashboardShellProps {
  session: StaffSession;
  children: React.ReactNode;
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NavProgressProvider>
      <div className="flex h-screen overflow-hidden bg-frost-white">
        <Sidebar
          session={session}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Topbar
            session={session}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </NavProgressProvider>
  );
}
