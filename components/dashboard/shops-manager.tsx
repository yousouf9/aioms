"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

interface Warehouse {
  id: string;
  name: string;
  type: "AGRO_INPUT" | "GRAIN";
}

interface Shop {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  warehouse: { name: string; type: string };
  _count: { stocks: number; sales: number };
}

interface Props {
  shops: Shop[];
  warehouses: Warehouse[];
}

export function ShopsManager({ shops, warehouses }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();

  const totalPages = Math.max(1, Math.ceil(shops.length / PAGE_SIZE));
  const paginated = shops.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-agro-dark">Shops</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Shop
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Name", "Linked Warehouse", "Type", "Location", "Products", "Sales", "Status", ""].map((h) => (
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
            {paginated.map((shop) => (
              <tr
                key={shop.id}
                onClick={() => router.push(`/dashboard/shops/${shop.id}`)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <span className="font-display font-semibold text-agro-dark">{shop.name}</span>
                </td>
                <td className="px-4 py-3 font-body text-sm text-agro-dark">
                  <span className="mr-1.5">{shop.warehouse.name}</span>
                  <span
                    className={cn(
                      "inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium",
                      shop.warehouse.type === "AGRO_INPUT"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {shop.warehouse.type === "AGRO_INPUT" ? "Agro Input" : "Grain"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium",
                      shop.warehouse.type === "AGRO_INPUT"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {shop.warehouse.type === "AGRO_INPUT" ? "Agro Input" : "Grain"}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-sm text-agro-dark">
                  {shop.location || <span className="text-muted">—</span>}
                </td>
                <td className="px-4 py-3 font-body text-sm text-agro-dark">
                  {shop._count.stocks}
                </td>
                <td className="px-4 py-3 font-body text-sm text-agro-dark">
                  {shop._count.sales}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        shop.isActive ? "bg-green-500" : "bg-gray-400"
                      )}
                    />
                    <span className={cn("font-body text-sm", shop.isActive ? "text-green-700" : "text-muted")}>
                      {shop.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-primary text-sm font-medium hover:underline">View →</span>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center font-body text-sm text-muted">
                  No shops found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="font-body text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-gray-200 text-agro-dark hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-gray-200 text-agro-dark hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginated.map((shop) => (
          <Link
            key={shop.id}
            href={`/dashboard/shops/${shop.id}`}
            className="block bg-white rounded-[12px] border border-gray-200 shadow-card p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-agro-dark">{shop.name}</h3>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    shop.isActive ? "bg-green-500" : "bg-gray-400"
                  )}
                />
                <span className={cn("font-body text-xs", shop.isActive ? "text-green-700" : "text-muted")}>
                  {shop.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <p className="text-muted text-xs mt-1">{shop.location || "No location set"}</p>
            <div className="mt-3 px-3 py-2 rounded-[8px] bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Linked Warehouse</p>
                <p className="text-sm font-medium text-agro-dark">{shop.warehouse.name}</p>
              </div>
              <span
                className={cn(
                  "inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium",
                  shop.warehouse.type === "AGRO_INPUT"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {shop.warehouse.type === "AGRO_INPUT" ? "Agro Input" : "Grain"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted">
              <span>{shop._count.stocks} product(s)</span>
              <span>{shop._count.sales} sale(s)</span>
            </div>
          </Link>
        ))}
        {paginated.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-8 text-center">
            <p className="text-muted text-sm font-body">No shops found.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="font-body text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-3 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-9 px-3 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddShopModal
          warehouses={warehouses}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddShopModal({ warehouses, onClose }: { warehouses: Warehouse[]; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    warehouseId: warehouses[0]?.id ?? "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const noWarehouses = warehouses.length === 0;

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (noWarehouses) {
      setError("Create a warehouse first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/inventory/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
        router.refresh();
      } else {
        setError(data.error ?? "Failed to save");
      }
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
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Shop</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Shop Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Warehouse *</label>
            {noWarehouses ? (
              <p className="text-red-500 text-sm py-2">Create a warehouse first</p>
            ) : (
              <select
                value={form.warehouseId}
                onChange={(e) => set("warehouseId", e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type === "AGRO_INPUT" ? "Agro Input" : "Grain"})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Lafia Main Market"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || noWarehouses}
              className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Shop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
