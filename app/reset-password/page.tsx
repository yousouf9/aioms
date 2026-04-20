"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to reset password");
        return;
      }

      router.push("/dashboard");
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
        <div className="text-center mb-8">
          <Image src="/logo-light.svg" alt="Nakowa" width={160} height={44} className="h-11 w-auto mx-auto mb-3" />
          <p className="text-muted text-sm mt-1">Staff Access Portal</p>
        </div>

        <div className="bg-slate-mid rounded-[12px] border border-slate-border p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-[8px] bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-frost-white text-lg">
                Set New Password
              </h2>
            </div>
          </div>
          <p className="text-muted text-sm font-body mb-6">
            You must change your temporary password before continuing.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-muted text-xs font-body mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-11 px-3 pr-10 rounded-[8px] bg-agro-dark border border-slate-border text-frost-white text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted hover:text-frost-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-muted text-xs font-body mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full h-11 px-3 rounded-[8px] bg-agro-dark border border-slate-border text-frost-white text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="Re-enter your password"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs py-2 px-3 rounded-[6px] bg-red-500/10 border border-red-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-[8px] bg-primary font-display font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Updating..." : "Set Password & Continue"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Nakowa &mdash; Lafia, Nasarawa State
        </p>
      </div>
    </div>
  );
}
