"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [devCode, setDevCode] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already verified or not logged in
    fetch("/api/public/aggregator/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          router.push("/aggregator/login");
        } else if (data.data.isEmailVerified) {
          router.push("/aggregator/portal");
        } else {
          setChecking(false);
        }
      })
      .catch(() => router.push("/aggregator/login"));
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) { setError("Enter the 6-digit code"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/public/aggregator/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/aggregator/portal");
      } else {
        setError(data.error || "Verification failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    setDevCode("");
    try {
      const res = await fetch("/api/public/aggregator/auth/verify-email", { method: "PUT" });
      const data = await res.json();
      if (data.success) {
        setResendMsg("New code sent to your email");
        if (data._dev_code) setDevCode(data._dev_code);
      } else {
        setError(data.error || "Failed to resend");
      }
    } catch {
      setError("Failed to resend");
    } finally {
      setResending(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
            <MailCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-agro-dark">Verify Your Email</h1>
          <p className="text-muted-dark text-sm mt-1">
            We sent a 6-digit verification code to your email. Enter it below to activate your account.
          </p>
        </div>

        <form onSubmit={handleVerify} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full h-14 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-center tracking-[0.4em] font-display font-bold text-xl focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {resendMsg && (
            <div className="p-3 rounded-[8px] bg-green-50 border border-green-200 text-green-700 text-sm">
              {resendMsg}
            </div>
          )}

          {devCode && (
            <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">Dev Mode — Code:</p>
              <p className="font-display text-xl font-bold text-amber-700 tracking-widest text-center">{devCode}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full h-11 rounded-[8px] border border-gray-200 text-muted-dark text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Resend Code
          </button>
        </form>
      </div>
    </div>
  );
}
