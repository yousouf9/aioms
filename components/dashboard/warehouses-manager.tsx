"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Warehouse, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarehouseItem {
  id: string;
  name: string;
  type: "AGRO_INPUT" | "GRAIN";
  location: string | null;
  isActive: boolean;
  shops: { id: string; name: string; isActive: boolean }[];
  _count: { stocks: number };
}

interface Props {
  warehouses: WarehouseItem[];
}

const PAGE_SIZE = 15;
// TODO: add server-side pagination if warehouse count grows beyond 50

export function WarehousesManager({ warehouses }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(warehouses.length / PAGE_SIZE));
  const paged = warehouses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Warehouse className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-xl font-bold text-agro-dark">Warehouses</h1>
            <p className="font-body text-xs text-muted mt-0.5">
              {warehouses.length} warehouse{warehouses.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Warehouse
        </button>
      </div>

      {warehouses.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-12 text-center">
          <Warehouse className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm font-body">No warehouses yet. Add the first one.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Name", "Type", "Location", "Shops", "Products", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((wh) => (
                  <tr
                    key={wh.id}
                    onClick={() => router.push(`/dashboard/warehouses/${wh.id}`)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-body text-sm font-medium text-agro-dark">
                      {wh.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-[6px] text-xs font-medium",
                          wh.type === "AGRO_INPUT"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {wh.type === "AGRO_INPUT" ? "Agro Input" : "Grain"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">
                      {wh.location || <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">
                      {wh.shops.length}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">
                      {wh._count.stocks}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            wh.isActive ? "bg-green-500" : "bg-gray-300"
                          )}
                        />
                        <span className="font-body text-xs text-muted">
                          {wh.isActive ? "Active" : "Inactive"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/warehouses/${wh.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary text-sm font-medium font-body hover:underline whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paged.map((wh) => (
              <Link
                key={wh.id}
                href={`/dashboard/warehouses/${wh.id}`}
                className="block bg-white rounded-[12px] border border-gray-200 shadow-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-agro-dark">{wh.name}</h3>
                    <p className="text-muted text-xs mt-1">{wh.location || "No location set"}</p>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-[6px] text-xs font-medium",
                      wh.type === "AGRO_INPUT"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {wh.type === "AGRO_INPUT" ? "Agro Input" : "Grain"}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                  <span>{wh._count.stocks} product(s) stocked</span>
                  <span>{wh.shops.length} shop(s) linked</span>
                </div>
                {wh.shops.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {wh.shops.map((shop) => (
                      <span key={shop.id} className="px-2 py-1 rounded-[6px] bg-gray-100 text-xs text-agro-dark">
                        {shop.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="font-body text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddWarehouseModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AddWarehouseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "",
    type: "AGRO_INPUT" as "AGRO_INPUT" | "GRAIN",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/inventory/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          location: form.location || undefined,
        }),
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
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Warehouse</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Warehouse Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "AGRO_INPUT" | "GRAIN" }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="AGRO_INPUT">Agro Input</option>
              <option value="GRAIN">Grain</option>
            </select>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Lafia Main Depot"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Add Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
