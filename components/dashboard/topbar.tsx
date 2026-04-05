"use client";
import { Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import type { StaffSession } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  STAFF: "Staff",
};

interface TopbarProps {
  session: StaffSession;
  onMenuClick: () => void;
}

export function Topbar({ session, onMenuClick }: TopbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-frost-white border-b border-gray-200 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-agro-dark hover:bg-gray-100 rounded-[8px] transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop spacer */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="flex items-center gap-2 pl-1">
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-sm text-agro-dark select-none">
              {session.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="font-body text-sm font-medium text-agro-dark leading-tight">
              {session.name}
            </p>
            <p className="font-body text-xs text-muted leading-tight">
              {ROLE_LABELS[session.role] ?? session.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
