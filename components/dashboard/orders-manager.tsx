"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export interface OrderRow {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  source: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Props {
  initialOrders: OrderRow[];
  initialPagination: Pagination;
  warehouses: { id: string; name: string; type: string }[];
  shops: { id: string; name: string; warehouseName: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-green-200 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  UNPAID: "bg-gray-100 text-gray-600",
  PARTIAL: "bg-amber-100 text-amber-700",
  REFUNDED: "bg-blue-100 text-blue-700",
};

const SOURCE_COLORS: Record<string, string> = {
  WEBSITE: "bg-blue-50 text-blue-600",
  WALK_IN: "bg-gray-100 text-gray-700",
  PHONE: "bg-purple-50 text-purple-600",
};

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PROCESSING", "READY", "DELIVERED", "CANCELLED"];
const PAYMENT_OPTIONS = ["UNPAID", "PAID", "PARTIAL", "REFUNDED"];

export function OrdersManager({ initialOrders, initialPagination }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, paymentFilter]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchOrders(page, debouncedSearch, statusFilter, paymentFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, paymentFilter]);

  async function fetchOrders(p: number, q: string, status: string, payment: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (payment) params.set("paymentStatus", payment);
      params.set("page", String(p));
      params.set("pageSize", "20");
      const res = await fetch(`/api/dashboard/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setPagination(data.pagination);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Orders</h1>
          <p className="font-body text-sm text-muted mt-0.5">
            {pagination.total} order{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by order code, name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 sm:max-w-xs h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Payments</option>
          {PAYMENT_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {orders.length === 0 && !loading ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">
            {debouncedSearch || statusFilter || paymentFilter
              ? "No orders match your filters."
              : "No orders yet. Orders from the website and walk-ins will appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={cn("hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden", loading && "opacity-60")}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Code</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Customer</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Items</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Total</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Status</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Payment</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Source</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Date</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{order.orderCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-agro-dark">{order.customerName}</p>
                      <p className="text-muted text-xs">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 font-display font-semibold">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium", STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600")}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium", PAYMENT_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600")}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium", SOURCE_COLORS[order.source] ?? "bg-gray-100 text-gray-600")}>
                        {order.source.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        className="h-8 px-3 rounded-[8px] border border-gray-200 text-agro-dark font-body text-xs hover:bg-gray-50 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={cn("md:hidden space-y-3", loading && "opacity-60")}>
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="block bg-white rounded-[12px] border border-gray-200 shadow-card p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-semibold text-agro-dark">{order.customerName}</p>
                    <p className="font-mono text-xs text-primary">{order.orderCode}</p>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium", STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600")}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
                  <span className="font-display font-bold">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium", PAYMENT_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600")}>
                    {order.paymentStatus}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium", SOURCE_COLORS[order.source] ?? "bg-gray-100 text-gray-600")}>
                    {order.source.replace("_", " ")}
                  </span>
                </div>
                <p className="text-muted text-xs mt-2">{formatDate(order.createdAt)}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1 || loading}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <p className="font-body text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
