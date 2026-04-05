"use client";
import { useState, useEffect } from "react";
import type { StaffSession } from "@/types";

export function useSession() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSession(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { session, loading };
}
