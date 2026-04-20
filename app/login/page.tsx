"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.mustResetPassword) {
        router.push("/reset-password");
        router.refresh();
        return;
      }

      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to connect. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-agro-dark px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo-light.svg" alt="Nakowa" width={160} height={44} className="h-11 w-auto mx-auto" />
          <p className="text-muted text-sm mt-3">Staff Access Portal</p>
        </div>

        {/* Card */}
        <div className="bg-slate-mid rounded-[12px] border border-slate-border p-8">
          <h2 className="font-display font-semibold text-frost-white text-lg mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-muted text-xs font-body mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-11 px-3 rounded-[8px] bg-agro-dark border border-slate-border text-frost-white text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="staff@nakowa.com.ng"
              />
            </div>

            <div>
              <label className="block text-muted text-xs font-body mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 px-3 rounded-[8px] bg-agro-dark border border-slate-border text-frost-white text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-status-cancelled text-xs py-2 px-3 rounded-[6px] bg-red-500/10 border border-red-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-[8px] bg-primary font-display font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Nakowa &mdash; Agricultural Supplies & Inventory Management
        </p>
      </div>
    </div>
  );
}
