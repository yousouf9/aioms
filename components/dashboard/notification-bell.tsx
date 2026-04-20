"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

const TYPE_COLORS: Record<string, string> = {
  ORDER_NEW: "bg-blue-100 text-blue-600",
  ORDER_UPDATED: "bg-blue-100 text-blue-600",
  PAYMENT_CONFIRMED: "bg-green-100 text-primary",
  LOW_STOCK: "bg-amber-100 text-amber-600",
  CREDIT_OVERDUE: "bg-red-100 text-red-600",
  TRANSFER_REQUEST: "bg-purple-100 text-purple-600",
  AGGREGATOR_NEW: "bg-orange-100 text-orange-600",
  SYSTEM: "bg-gray-100 text-muted",
};

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load notifications when panel opens
  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnread(data.data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }

  // SSE connection
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/sse");

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as { type: string; unreadCount?: number; title?: string; message?: string };
          if (event.type === "CONNECTED" && event.unreadCount !== undefined) {
            setUnread(event.unreadCount);
          } else if (event.type !== "CONNECTED") {
            // New notification arrived — bump unread and prepend if panel is open
            setUnread((n) => n + 1);
            setNotifications((prev) => [
              {
                id: `live-${Date.now()}`,
                type: event.type,
                title: event.title ?? "",
                message: event.message ?? "",
                isRead: false,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es?.close();
        // Reconnect after 5s
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await loadNotifications();
  }

  async function markAllRead() {
    await fetch("/api/dashboard/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function dismissOne(id: string) {
    await fetch("/api/dashboard/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnread((prev) => {
      const wasDismissedUnread = notifications.find((n) => n.id === id && !n.isRead);
      return wasDismissedUnread ? Math.max(0, prev - 1) : prev;
    });
  }

  async function dismissAll() {
    await fetch("/api/dashboard/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications([]);
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-agro-dark hover:bg-gray-100 rounded-[8px] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-[12px] border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-agro-dark text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="h-5 px-1.5 flex items-center justify-center bg-red-500 text-white font-body text-xs rounded-full">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="h-7 px-2 flex items-center gap-1 text-xs font-body text-muted hover:text-agro-dark hover:bg-gray-100 rounded-[6px] transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="h-7 px-2 flex items-center gap-1 text-xs font-body text-muted hover:text-red-500 hover:bg-red-50 rounded-[6px] transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center text-muted hover:text-agro-dark hover:bg-gray-100 rounded-[6px] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <p className="font-body text-xs text-muted">Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="font-body text-sm text-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn("px-4 py-3 group relative", !n.isRead && "bg-blue-50/50")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className={cn("mt-0.5 text-xs font-body font-medium px-1.5 py-0.5 rounded-[4px] shrink-0 whitespace-nowrap", TYPE_COLORS[n.type] ?? "bg-gray-100 text-muted")}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                      {!n.isRead && (
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <button
                      onClick={() => dismissOne(n.id)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-muted hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="font-body text-sm font-medium text-agro-dark mt-1">{n.title}</p>
                  <p className="font-body text-xs text-muted mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="font-body text-xs text-muted mt-1">{formatAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
