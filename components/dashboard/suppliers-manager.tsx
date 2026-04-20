"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, Plus, Search } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface SupplierRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  isActive: boolean;
  deliveryCount: number;
  totalDelivered: number;
  totalPaid: number;
}

interface Props {
  suppliers: SupplierRow[];
}

export function SuppliersManager({ suppliers }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = search
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search) ||
          (s.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : suppliers;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-xl font-bold text-agro-dark">Suppliers</h1>
            <p className="font-body text-xs text-muted mt-0.5">
              {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="h-11 pl-9 pr-3 w-48 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-12 text-center">
          <Truck className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm font-body">
            {search ? `No suppliers match "${search}".` : "No suppliers yet. Add your first supplier."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Supplier", "Phone", "Deliveries", "Total Supplied", "Total Paid", "Balance", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const balance = s.totalDelivered - s.totalPaid;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-body text-sm font-medium text-agro-dark">{s.name}</p>
                        {s.email && <p className="text-xs text-muted">{s.email}</p>}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{s.phone}</td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{s.deliveryCount}</td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{formatCurrency(s.totalDelivered)}</td>
                      <td className="px-4 py-3 font-body text-sm text-green-600">{formatCurrency(s.totalPaid)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-body text-sm font-medium", balance > 0 ? "text-red-600" : "text-green-600")}>
                          {balance > 0 ? `-${formatCurrency(balance)}` : "Settled"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", s.isActive ? "bg-green-500" : "bg-gray-300")} />
                          <span className="font-body text-xs text-muted">{s.isActive ? "Active" : "Inactive"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/suppliers/${s.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary text-sm font-medium font-body hover:underline whitespace-nowrap"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((s) => {
              const balance = s.totalDelivered - s.totalPaid;
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/suppliers/${s.id}`}
                  className="block bg-white rounded-[12px] border border-gray-200 shadow-card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-semibold text-agro-dark">{s.name}</h3>
                      <p className="text-muted text-xs mt-0.5">{s.phone}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium", s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted">Supplied</p>
                      <p className="font-display font-bold text-agro-dark text-sm">{formatCurrency(s.totalDelivered)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Paid</p>
                      <p className="font-display font-bold text-green-600 text-sm">{formatCurrency(s.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Balance</p>
                      <p className={cn("font-display font-bold text-sm", balance > 0 ? "text-red-600" : "text-green-600")}>
                        {balance > 0 ? formatCurrency(balance) : "—"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {showAdd && (
        <AddSupplierModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AddSupplierModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email || undefined, address: form.address || undefined, notes: form.notes || undefined }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Supplier</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Name *</label>
            <input required type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Phone *</label>
            <input required type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors resize-none" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Add Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
