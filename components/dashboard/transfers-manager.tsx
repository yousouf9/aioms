"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Plus, Search } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface TransferRow {
  id: string;
  quantity: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";
  notes: string | null;
  createdAt: string;
  fromWarehouseId: string | null;
  fromShopId: string | null;
  toWarehouseId: string | null;
  toShopId: string | null;
  product: { name: string; unit: string };
  fromWarehouse: { name: string } | null;
  fromShop: { name: string } | null;
  toWarehouse: { name: string } | null;
  toShop: { name: string } | null;
  requestedBy: { name: string };
  approvedBy: { name: string } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  initialTransfers: TransferRow[];
  initialPagination: Pagination;
  warehouses?: LocationOption[];
  shops?: LocationOption[];
  canCreate?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const INPUT_CLASS =
  "h-11 rounded-[8px] border border-gray-200 font-body text-sm px-3 focus:outline-none focus:border-primary bg-white text-agro-dark transition-colors";

function getDirection(row: TransferRow): "TO_SHOP" | "TO_WAREHOUSE" | "RETURN" | null {
  if (row.toShopId) return "TO_SHOP";
  if (row.toWarehouseId && row.fromWarehouseId) return "TO_WAREHOUSE";
  if (row.fromShopId) return "RETURN";
  return null;
}

function DirectionBadge({ row }: { row: TransferRow }) {
  const dir = getDirection(row);
  if (dir === "TO_SHOP")
    return (
      <span className="rounded-[6px] px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-purple-50 text-purple-700">
        → Shop
      </span>
    );
  if (dir === "TO_WAREHOUSE")
    return (
      <span className="rounded-[6px] px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-blue-50 text-blue-700">
        → Warehouse
      </span>
    );
  if (dir === "RETURN")
    return (
      <span className="rounded-[6px] px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-amber-50 text-amber-700">
        ← Return
      </span>
    );
  return <span className="text-xs text-muted">—</span>;
}

function StatusBadge({ status }: { status: TransferRow["status"] }) {
  return (
    <span className={cn("rounded-[6px] px-2 py-0.5 text-xs font-medium inline-flex items-center gap-0.5", STATUS_COLORS[status])}>
      {status === "COMPLETED" && <CheckCircle2 className="h-3 w-3 text-green-600 inline" />}
      {status}
    </span>
  );
}

export function TransfersManager({ initialTransfers, initialPagination, warehouses = [], shops = [], canCreate = false }: Props) {
  const [transfers, setTransfers] = useState<TransferRow[]>(initialTransfers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const isFirstRender = useRef(true);

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, directionFilter]);

  // Fetch whenever page or filters change (skip initial render — use SSR data)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchTransfers(page, debouncedSearch, statusFilter, directionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, directionFilter]);

  async function fetchTransfers(p: number, q: string, status: string, direction: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (direction) params.set("direction", direction);
      params.set("page", String(p));
      params.set("pageSize", "25");
      const res = await fetch(`/api/dashboard/inventory/transfers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransfers(data.data);
        setPagination(data.pagination);
      }
    } catch {
      // network error — keep current data
    } finally {
      setLoading(false);
    }
  }

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl text-agro-dark">Stock Transfers</h1>
            <span className="rounded-[6px] px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 font-body">
              {pagination.total}
            </span>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Transfer
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(INPUT_CLASS, "flex-1 sm:max-w-xs")}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">All Directions</option>
          <option value="TO_SHOP">→ Shop</option>
          <option value="TO_WAREHOUSE">→ Warehouse</option>
          <option value="RETURN">← Return</option>
        </select>
      </div>

      {transfers.length === 0 && !loading ? (
        /* Empty state */
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <ArrowRightLeft className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-display font-semibold text-agro-dark text-sm mb-1">No transfers found</p>
          <p className="font-body text-xs text-muted">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className={cn(
              "hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden",
              loading && "opacity-60"
            )}
          >
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    "Date",
                    "Product",
                    "Direction",
                    "From",
                    "To",
                    "Qty",
                    "Status",
                    "Requested By",
                    "Notes",
                  ].map((col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap bg-gray-50/50 border-b border-gray-100"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 font-body text-xs text-muted whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    {/* Product */}
                    <td className="px-4 py-3">
                      <p className="font-display font-semibold text-agro-dark text-sm leading-tight">
                        {row.product.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{row.product.unit.toLowerCase()}</p>
                    </td>
                    {/* Direction */}
                    <td className="px-4 py-3">
                      <DirectionBadge row={row} />
                    </td>
                    {/* From */}
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">
                      {row.fromWarehouse?.name ?? row.fromShop?.name ?? "—"}
                    </td>
                    {/* To */}
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">
                      {row.toWarehouse?.name ?? row.toShop?.name ?? "—"}
                    </td>
                    {/* Qty */}
                    <td className="px-4 py-3">
                      <span className="font-body text-sm text-agro-dark font-medium">{row.quantity}</span>
                      <span className="text-xs text-muted ml-1">{row.product.unit.toLowerCase()}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    {/* Requested By */}
                    <td className="px-4 py-3 font-body text-xs text-muted whitespace-nowrap">
                      {row.requestedBy.name}
                    </td>
                    {/* Notes */}
                    <td className="px-4 py-3 font-body text-xs text-muted max-w-[160px] truncate">
                      {row.notes ? (row.notes.length > 40 ? row.notes.slice(0, 40) + "…" : row.notes) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={cn("md:hidden space-y-3", loading && "opacity-60")}>
            {transfers.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4"
              >
                {/* Row 1: product name + status badge */}
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display font-semibold text-agro-dark text-sm leading-tight">
                    {row.product.name}
                  </p>
                  <StatusBadge status={row.status} />
                </div>
                {/* Row 2: direction badge + from → to */}
                <div className="flex items-center gap-2 mb-1.5">
                  <DirectionBadge row={row} />
                  <span className="font-body text-xs text-muted">
                    {row.fromWarehouse?.name ?? row.fromShop?.name ?? "—"}
                    {" → "}
                    {row.toWarehouse?.name ?? row.toShop?.name ?? "—"}
                  </span>
                </div>
                {/* Row 3: qty + date */}
                <div className="flex items-center justify-between font-body text-xs text-muted">
                  <span>
                    {row.quantity} {row.product.unit.toLowerCase()}(s)
                  </span>
                  <span>{formatDate(row.createdAt)}</span>
                </div>
                {/* Row 4: notes (if present) */}
                {row.notes && (
                  <p className="font-body text-xs text-muted italic mt-1.5 truncate">{row.notes}</p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1 || loading}
                  className="h-11 px-4 rounded-[8px] border border-gray-200 font-body text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="font-body text-sm text-agro-dark px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages || loading}
                  className="h-11 px-4 rounded-[8px] border border-gray-200 font-body text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
              <p className="font-body text-xs text-muted">
                Showing {start}–{end} of {pagination.total} transfers
              </p>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateTransferModal
          warehouses={warehouses}
          shops={shops}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            fetchTransfers(1, debouncedSearch, statusFilter, directionFilter);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

// ─── Create Transfer Modal ─────────────────────────────────────────────────

type SourceType = "warehouse" | "shop";
type DestType = "warehouse" | "shop";

interface ProductSearchResult {
  id: string;
  name: string;
  unit: string;
  warehouseStocks: { warehouseId: string; quantity: number }[];
  shopStocks: { shopId: string; quantity: number }[];
}

function CreateTransferModal({
  warehouses,
  shops,
  onClose,
  onSaved,
}: {
  warehouses: LocationOption[];
  shops: LocationOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sourceType, setSourceType] = useState<SourceType>("warehouse");
  const [sourceId, setSourceId] = useState("");
  const [destType, setDestType] = useState<DestType>("shop");
  const [destId, setDestId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [immediate, setImmediate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/dashboard/inventory/products?q=${encodeURIComponent(productSearch)}&withStockDetails=1`);
        const data = await res.json();
        if (data.success) setProductResults(data.data.slice(0, 8));
      } finally { setSearchLoading(false); }
    }, 300);
  }, [productSearch]);

  function getAvailableQty(): number {
    if (!selectedProduct) return 0;
    if (sourceType === "warehouse") {
      return selectedProduct.warehouseStocks?.find((s) => s.warehouseId === sourceId)?.quantity ?? 0;
    }
    return selectedProduct.shopStocks?.find((s) => s.shopId === sourceId)?.quantity ?? 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !sourceId || !destId) { setError("Fill in all required fields."); return; }
    if (sourceType === destType && sourceId === destId) { setError("Source and destination cannot be the same."); return; }
    if (sourceType === "shop" && destType === "shop") { setError("Shop-to-shop transfers are not supported. Use shop → warehouse → shop."); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        productId: selectedProduct.id,
        quantity,
        notes: notes || undefined,
        immediate,
      };
      if (sourceType === "warehouse") body.fromWarehouseId = sourceId;
      else body.fromShopId = sourceId;
      if (destType === "warehouse") body.toWarehouseId = destId;
      else body.toShopId = destId;

      const res = await fetch("/api/dashboard/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to create transfer");
    } catch { setError("Connection error"); } finally { setSaving(false); }
  }

  const availableQty = getAvailableQty();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl my-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">New Stock Transfer</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">

          {/* Source */}
          <div>
            <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2">From (Source)</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={sourceType} onChange={(e) => { setSourceType(e.target.value as SourceType); setSourceId(""); }}
                className="h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
                <option value="warehouse">Warehouse</option>
                <option value="shop">Shop</option>
              </select>
              <select required value={sourceId} onChange={(e) => setSourceId(e.target.value)}
                className="h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
                <option value="">Select…</option>
                {(sourceType === "warehouse" ? warehouses : shops).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div>
            <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2">To (Destination)</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={destType} onChange={(e) => { setDestType(e.target.value as DestType); setDestId(""); }}
                className="h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
                <option value="shop">Shop</option>
                <option value="warehouse">Warehouse</option>
              </select>
              <select required value={destId} onChange={(e) => setDestId(e.target.value)}
                className="h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
                <option value="">Select…</option>
                {(destType === "warehouse" ? warehouses : shops).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product search */}
          <div>
            <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2">Product</p>
            {selectedProduct ? (
              <div className="flex items-center justify-between p-3 rounded-[8px] border border-primary/30 bg-primary/5">
                <div>
                  <p className="font-body text-sm font-medium text-agro-dark">{selectedProduct.name}</p>
                  {sourceId && <p className="font-body text-xs text-muted mt-0.5">Available: {availableQty} {selectedProduct.unit.toLowerCase()}</p>}
                </div>
                <button type="button" onClick={() => setSelectedProduct(null)} className="text-muted hover:text-red-500 transition-colors">✕</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product…"
                  className="w-full h-11 pl-9 pr-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
                {(productResults.length > 0 || searchLoading) && (
                  <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-[8px] shadow-lg z-20 overflow-hidden">
                    {searchLoading ? (
                      <p className="px-3 py-2 text-xs text-muted font-body">Searching…</p>
                    ) : productResults.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setSelectedProduct(p); setProductSearch(""); setProductResults([]); }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left">
                        <p className="font-body text-sm text-agro-dark">{p.name}</p>
                        <p className="text-xs text-muted">{p.unit}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Quantity *</label>
            <input type="number" min={1} max={availableQty || undefined} required value={quantity || ""}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setQuantity(v); }}
              onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) setQuantity(1); }}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
            {selectedProduct && sourceId && availableQty > 0 && (
              <p className="font-body text-xs text-muted mt-1">Max available: {availableQty}</p>
            )}
          </div>

          {/* Mode */}
          <div className="flex items-center gap-3 p-3 rounded-[8px] bg-gray-50 border border-gray-200">
            <input type="checkbox" id="immediate" checked={immediate} onChange={(e) => setImmediate(e.target.checked)}
              className="h-4 w-4 accent-primary" />
            <label htmlFor="immediate" className="font-body text-sm text-agro-dark">
              Complete immediately (bypass approval)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm font-body">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !selectedProduct || !sourceId || !destId}
              className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 hover:bg-primary-dark transition-colors">
              {saving ? "Creating…" : "Create Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
