"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, CheckCircle2 } from "lucide-react";
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

interface Props {
  initialTransfers: TransferRow[];
  initialPagination: Pagination;
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

export function TransfersManager({ initialTransfers, initialPagination }: Props) {
  const [transfers, setTransfers] = useState<TransferRow[]>(initialTransfers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
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
      <div className="flex items-center gap-3 mb-5">
        <ArrowRightLeft className="h-6 w-6 text-primary" />
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-2xl text-agro-dark">Stock Transfers</h1>
          <span className="rounded-[6px] px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 font-body">
            {pagination.total}
          </span>
        </div>
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
    </div>
  );
}
