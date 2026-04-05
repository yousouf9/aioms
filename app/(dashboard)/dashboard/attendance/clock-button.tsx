"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut } from "lucide-react";

interface ClockButtonProps {
  isClockedIn: boolean;
  hasCompletedToday?: boolean;
}

export function ClockButton({ isClockedIn, hasCompletedToday }: ClockButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already done for the day and not currently clocked in
  const disabled = (!isClockedIn && hasCompletedToday) || loading;

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/attendance", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed");
      }
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`h-11 px-6 rounded-[8px] font-display font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97] ${
          isClockedIn
            ? "bg-red-500/10 border border-red-500/30 text-status-cancelled hover:bg-red-500/20"
            : "bg-primary text-agro-dark hover:bg-primary/90"
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isClockedIn ? (
          <LogOut className="h-4 w-4" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {loading ? "Saving…" : isClockedIn ? "Clock Out" : hasCompletedToday ? "Done for Today" : "Clock In"}
      </button>
      {error && <p className="font-body text-xs text-status-cancelled mt-1.5">{error}</p>}
    </div>
  );
}
