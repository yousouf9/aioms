"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";

export default function AggregatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/aggregator/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.data.isEmailVerified ? "/aggregator/portal" : "/aggregator/verify-email");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-agro-dark">Aggregator Login</h1>
          <p className="text-muted-dark text-sm mt-1">Sign in to your aggregator portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/aggregator/forgot-password" className="text-primary font-medium hover:underline">
              Forgot password?
            </Link>
            <Link href="/aggregator/register" className="text-primary font-medium hover:underline">
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
