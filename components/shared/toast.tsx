"use client";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastMessage } from "@/hooks/use-toast";

interface ToastListProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} as const;

const STYLES = {
  success: "border-green-200 text-green-800",
  error: "border-red-200 text-red-800",
  info: "border-blue-200 text-blue-800",
  warning: "border-amber-200 text-amber-800",
} as const;

const ICON_STYLES = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-amber-500",
} as const;

export function ToastList({ toasts, onDismiss }: ToastListProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-[8px] border shadow-modal",
              "bg-white min-w-[280px] max-w-sm font-body text-sm pointer-events-auto",
              STYLES[t.variant]
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", ICON_STYLES[t.variant])} />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
