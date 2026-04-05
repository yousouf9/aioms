"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";

export default function AggregatorForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/aggregator/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        if (data._dev_code) setDevCode(data._dev_code);
      } else {
        setError(data.error || "Failed to send reset code");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-agro-dark mb-2">Check Your Email</h2>
            <p className="text-muted-dark text-sm mb-6">
              If an account exists with <strong>{email}</strong>, a reset code has been sent.
            </p>

            {devCode && (
              <div className="bg-amber-50 border border-amber-200 rounded-[8px] p-3 mb-4">
                <p className="text-xs text-amber-700 font-medium">Dev Mode — Reset Code:</p>
                <p className="font-display text-2xl font-bold text-amber-700 tracking-widest">{devCode}</p>
              </div>
            )}

            <Link
              href={`/aggregator/reset-password?email=${encodeURIComponent(email)}`}
              className="flex items-center justify-center w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              Enter Reset Code
            </Link>
            <Link href="/aggregator/login" className="block mt-3 text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-agro-dark">Forgot Password</h1>
          <p className="text-muted-dark text-sm mt-1">Enter your email to receive a reset code</p>
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
            {loading ? "Sending..." : "Send Reset Code"}
          </button>

          <p className="text-center text-sm text-muted">
            <Link href="/aggregator/login" className="text-primary font-medium hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
