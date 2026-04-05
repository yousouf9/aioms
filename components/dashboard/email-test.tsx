"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";

export function EmailTest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/dashboard/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setResult({ ok: data.success, msg: data.message ?? data.error ?? "Unknown result" });
    } catch {
      setResult({ ok: false, msg: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-6">
      <h2 className="font-display font-semibold text-agro-dark mb-1">Email Test</h2>
      <p className="font-body text-xs text-muted mb-4">
        Send a test order confirmation email to verify ZeptoMail is working.
      </p>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="flex-1 h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-11 px-4 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm hover:bg-primary-light transition-colors disabled:opacity-60 flex items-center gap-2 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send Test
        </button>
      </form>

      {result && (
        <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-[8px] text-sm font-body ${
          result.ok
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {result.msg}
        </div>
      )}
    </div>
  );
}
