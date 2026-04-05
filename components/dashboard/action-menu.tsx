"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

interface ActionMenuProps {
  children: (close: () => void) => React.ReactNode;
  disabled?: boolean;
}

export function ActionMenu({ children, disabled }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; direction: "down" | "up" }>({
    top: 0,
    left: 0,
    direction: "down",
  });

  useEffect(() => {
    if (!open || !btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = 160; // approximate max menu height
    const spaceBelow = window.innerHeight - rect.bottom;
    const direction = spaceBelow < menuHeight ? "up" : "down";

    setPos({
      top: direction === "down" ? rect.bottom + 4 : rect.top - 4,
      left: rect.right,
      direction,
    });
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="h-9 w-9 flex items-center justify-center rounded-[8px] hover:bg-gray-100 transition-colors text-muted hover:text-agro-dark disabled:opacity-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-50 w-48 bg-white rounded-[10px] border border-gray-200 shadow-lg py-1"
            style={{
              ...(pos.direction === "down"
                ? { top: pos.top }
                : { bottom: window.innerHeight - pos.top }),
              left: pos.left,
              transform: "translateX(-100%)",
            }}
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </>
  );
}

export function ActionMenuItem({
  onClick,
  icon,
  label,
  variant = "default",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 h-10 text-left font-body text-sm hover:bg-gray-50 transition-colors ${
        variant === "danger" ? "text-status-cancelled hover:bg-red-50" : "text-agro-dark"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
