"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2, Search } from "lucide-react";
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
  const [showCreate, setShowCreate] = useState(false);
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
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display font-bold text-2xl text-agro-dark">Orders</h1>
            <p className="font-body text-sm text-muted mt-0.5">
              {pagination.total} order{pagination.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Order
        </button>
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

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onSaved={(orderId) => {
            setShowCreate(false);
            router.push(`/dashboard/orders/${orderId}`);
          }}
        />
      )}
    </div>
  );
}

// ─── Product search result type ───────────────────────────────────────────────
interface ProductResult {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  shopStock: number;
  warehouseStock: number;
}

interface OrderLineItem {
  productId: string;
  productName: string;
  unit: string;
  sellingPrice: number;
  quantity: number;
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

function CreateOrderModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (orderId: string) => void;
}) {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerId: "",
    source: "WALK_IN",
    deliveryMethod: "PICKUP",
    deliveryAddress: "",
    notes: "",
  });
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/dashboard/inventory/products?q=${encodeURIComponent(productSearch)}`);
        const data = await res.json();
        if (data.success) setProductResults(data.data.slice(0, 8));
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [productSearch]);

  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerResults([]); return; }
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
    customerSearchTimeout.current = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const res = await fetch(`/api/dashboard/customers?q=${encodeURIComponent(customerSearch)}&pageSize=6`);
        const data = await res.json();
        if (data.success) setCustomerResults(data.data ?? []);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
  }, [customerSearch]);

  function selectCustomer(c: CustomerResult) {
    setForm((f) => ({ ...f, customerName: c.name, customerPhone: c.phone, customerEmail: c.email ?? "", customerId: c.id }));
    setCustomerSearch("");
    setCustomerResults([]);
  }

  function addItem(product: ProductResult) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, productName: product.name, unit: product.unit, sellingPrice: product.sellingPrice, quantity: 1 }];
    });
    setProductSearch("");
    setProductResults([]);
  }

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = items.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("Add at least one product."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail || undefined,
          customerId: form.customerId || undefined,
          source: form.source,
          deliveryMethod: form.deliveryMethod,
          deliveryAddress: form.deliveryAddress || undefined,
          notes: form.notes || undefined,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.data.id);
      } else {
        setError(data.error ?? "Failed to create order");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-[12px] shadow-xl my-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-[12px] z-10">
          <h2 className="font-display font-bold text-lg text-agro-dark">New Order</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Customer info */}
          <div>
            <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2">Customer</p>

            {/* Customer search — find existing */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search existing customers…"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
              />
              {(customerResults.length > 0 || customerSearchLoading) && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-[8px] shadow-lg z-20 overflow-hidden">
                  {customerSearchLoading ? (
                    <p className="px-3 py-2 text-xs text-muted font-body">Searching…</p>
                  ) : (
                    customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div>
                          <p className="font-body text-sm text-agro-dark">{c.name}</p>
                          <p className="text-xs text-muted">{c.phone}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {form.customerId && (
              <div className="mb-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-[8px] flex items-center justify-between">
                <p className="font-body text-xs text-primary">Linked to existing customer</p>
                <button type="button" onClick={() => setForm((f) => ({ ...f, customerId: "" }))} className="text-xs text-muted hover:text-agro-dark">✕ Unlink</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block font-body text-xs text-muted mb-1">Name *</label>
                <input
                  required
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block font-body text-xs text-muted mb-1">Phone *</label>
                <input
                  required
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-body text-xs text-muted mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Order details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs text-muted mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="WALK_IN">Walk-in</option>
                <option value="PHONE">Phone</option>
                <option value="WEBSITE">Website</option>
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">Delivery</label>
              <select
                value={form.deliveryMethod}
                onChange={(e) => setForm((f) => ({ ...f, deliveryMethod: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
          </div>

          {form.deliveryMethod === "DELIVERY" && (
            <div>
              <label className="block font-body text-xs text-muted mb-1">Delivery Address</label>
              <input
                type="text"
                value={form.deliveryAddress}
                onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {/* Product search */}
          <div>
            <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2">Products</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search and add products…"
                className="w-full h-11 pl-9 pr-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
              />
              {(productResults.length > 0 || searchLoading) && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-[8px] shadow-lg z-20 overflow-hidden">
                  {searchLoading ? (
                    <p className="px-3 py-2 text-xs text-muted font-body">Searching…</p>
                  ) : (
                    productResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div>
                          <p className="font-body text-sm text-agro-dark">{p.name}</p>
                          <p className="text-xs text-muted">Stock: {p.shopStock + p.warehouseStock} {p.unit.toLowerCase()}</p>
                        </div>
                        <p className="text-sm font-display font-semibold text-primary">{formatCurrency(p.sellingPrice)}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="border border-gray-100 rounded-[8px] overflow-hidden">
              {items.map((item, idx) => (
                <div key={item.productId} className={cn("flex items-center gap-3 px-3 py-2", idx > 0 && "border-t border-gray-100")}>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-agro-dark truncate">{item.productName}</p>
                    <p className="text-xs text-muted">{formatCurrency(item.sellingPrice)} / {item.unit.toLowerCase()}</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity || ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 1) updateQty(item.productId, v);
                    }}
                    onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateQty(item.productId, 1); }}
                    className="w-16 h-9 px-2 text-center rounded-[6px] border border-gray-200 font-body text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="w-20 text-right font-display font-semibold text-sm text-agro-dark">
                    {formatCurrency(item.sellingPrice * item.quantity)}
                  </p>
                  <button type="button" onClick={() => removeItem(item.productId)} className="h-8 w-8 flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 rounded-[6px] transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="font-body text-xs text-muted">Subtotal</p>
                <p className="font-display font-bold text-agro-dark">{formatCurrency(subtotal)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-body">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || items.length === 0} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 hover:bg-primary-dark transition-colors">
              {saving ? "Creating…" : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
