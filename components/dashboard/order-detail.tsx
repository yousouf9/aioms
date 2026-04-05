"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: {
    name: string;
    unit: string;
    imageUrl?: string | null;
  };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
}

interface FullOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryMethod: string;
  deliveryAddress?: string | null;
  notes?: string | null;
  status: string;
  paymentStatus: string;
  source: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  processedBy?: { name: string } | null;
  fulfilledFromWarehouse?: { name: string } | null;
  fulfilledFromShop?: { name: string } | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  } | null;
  items: OrderItem[];
  payments: Payment[];
}

interface Props {
  order: FullOrder;
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

function Badge({ text, colorClass }: { text: string; colorClass: string }) {
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium", colorClass)}>
      {text}
    </span>
  );
}

export function OrderDetail({ order, warehouses, shops }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error ?? "Failed to update order");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isDone = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="pb-24 md:pb-0">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-muted text-sm hover:text-agro-dark transition-colors font-body"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl text-primary font-mono tracking-tight">
            {order.orderCode}
          </h1>
          <p className="font-body text-sm text-muted mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge text={order.status} colorClass={STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"} />
          <Badge text={order.paymentStatus} colorClass={PAYMENT_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600"} />
          <Badge text={order.source.replace("_", " ")} colorClass={SOURCE_COLORS[order.source] ?? "bg-gray-100 text-gray-600"} />
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Customer Info */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <h2 className="font-display font-semibold text-agro-dark mb-3">Customer</h2>
          <dl className="space-y-2 font-body text-sm">
            <div>
              <dt className="text-muted text-xs">Name</dt>
              <dd className="text-agro-dark font-medium">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Phone</dt>
              <dd className="text-agro-dark">{order.customerPhone}</dd>
            </div>
            {order.customerEmail && (
              <div>
                <dt className="text-muted text-xs">Email</dt>
                <dd className="text-agro-dark">{order.customerEmail}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted text-xs">Delivery Method</dt>
              <dd className="text-agro-dark">{order.deliveryMethod}</dd>
            </div>
            {order.deliveryAddress && (
              <div>
                <dt className="text-muted text-xs">Address</dt>
                <dd className="text-agro-dark">{order.deliveryAddress}</dd>
              </div>
            )}
            {order.notes && (
              <div>
                <dt className="text-muted text-xs">Notes</dt>
                <dd className="text-agro-dark italic">{order.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <h2 className="font-display font-semibold text-agro-dark mb-3">Summary</h2>
          <dl className="space-y-2 font-body text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-agro-dark">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Delivery Fee</dt>
              <dd className="text-agro-dark">{formatCurrency(order.deliveryFee)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <dt className="font-display font-semibold text-agro-dark">Total</dt>
              <dd className="font-display font-bold text-agro-dark text-base">{formatCurrency(order.total)}</dd>
            </div>
            <div className="flex items-center justify-between pt-1">
              <dt className="text-muted">Payment Status</dt>
              <dd>
                <Badge text={order.paymentStatus} colorClass={PAYMENT_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600"} />
              </dd>
            </div>
            {order.processedBy && (
              <div className="flex items-center justify-between">
                <dt className="text-muted">Processed By</dt>
                <dd className="text-agro-dark">{order.processedBy.name}</dd>
              </div>
            )}
            {order.fulfilledFromWarehouse && (
              <div className="flex items-center justify-between">
                <dt className="text-muted">Fulfilled From</dt>
                <dd className="text-agro-dark">{order.fulfilledFromWarehouse.name} (warehouse)</dd>
              </div>
            )}
            {order.fulfilledFromShop && (
              <div className="flex items-center justify-between">
                <dt className="text-muted">Fulfilled From</dt>
                <dd className="text-agro-dark">{order.fulfilledFromShop.name} (shop)</dd>
              </div>
            )}
          </dl>

          {order.payments.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-display font-semibold text-agro-dark mb-2">Payments</p>
              <div className="space-y-1.5">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs font-body">
                    <span className="text-muted">{p.method} — {formatDate(p.createdAt)}</span>
                    <span className="text-agro-dark font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-agro-dark">
            Items ({order.items.length})
          </h2>
        </div>

        {/* Desktop */}
        <table className="hidden md:table w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Product</th>
              <th className="text-right px-5 py-3 font-display font-semibold text-agro-dark">Qty</th>
              <th className="text-right px-5 py-3 font-display font-semibold text-agro-dark">Unit Price</th>
              <th className="text-right px-5 py-3 font-display font-semibold text-agro-dark">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {item.product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-10 w-10 rounded-[6px] object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-[6px] bg-gray-100 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-agro-dark">{item.product.name}</p>
                      <p className="text-muted text-xs">{item.product.unit}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-agro-dark">{item.quantity}</td>
                <td className="px-5 py-3 text-right text-agro-dark">{formatCurrency(item.unitPrice)}</td>
                <td className="px-5 py-3 text-right font-display font-semibold text-agro-dark">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              {item.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="h-10 w-10 rounded-[6px] object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-[6px] bg-gray-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-agro-dark text-sm">{item.product.name}</p>
                <p className="text-muted text-xs">{item.quantity} × {formatCurrency(item.unitPrice)} ({item.product.unit})</p>
              </div>
              <p className="font-display font-semibold text-agro-dark text-sm flex-shrink-0">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-[8px] bg-red-50 border border-red-200 text-red-600 text-sm font-body">
          {error}
        </div>
      )}

      {/* Action bar */}
      {isDone ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card px-5 py-4 text-center">
          <p className="text-muted font-body text-sm">
            This order is <span className="font-semibold text-agro-dark">{order.status}</span>.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop inline action bar */}
          <div className="hidden md:flex items-center gap-3">
            <ActionButtons
              status={order.status}
              loading={loading}
              onPatch={patch}
              onOpenProcess={() => setShowProcessModal(true)}
            />
          </div>

          {/* Mobile sticky action bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
            <ActionButtons
              status={order.status}
              loading={loading}
              onPatch={patch}
              onOpenProcess={() => setShowProcessModal(true)}
            />
          </div>
        </>
      )}

      {showProcessModal && (
        <ProcessOrderModal
          orderId={order.id}
          warehouses={warehouses}
          shops={shops}
          onClose={() => setShowProcessModal(false)}
          onSuccess={() => {
            setShowProcessModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ActionButtons({
  status,
  loading,
  onPatch,
  onOpenProcess,
}: {
  status: string;
  loading: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onOpenProcess: () => void;
}) {
  if (status === "PENDING") {
    return (
      <>
        <button
          onClick={() => onPatch({ status: "CONFIRMED" })}
          disabled={loading}
          className="flex-1 md:flex-none h-11 px-6 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Confirm Order
        </button>
        <button
          onClick={() => onPatch({ status: "CANCELLED" })}
          disabled={loading}
          className="flex-1 md:flex-none h-11 px-6 rounded-[8px] border border-red-200 text-red-600 hover:bg-red-50 font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Cancel Order
        </button>
      </>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <>
        <button
          onClick={onOpenProcess}
          disabled={loading}
          className="flex-1 md:flex-none h-11 px-6 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          Process Order
        </button>
        <button
          onClick={() => onPatch({ status: "CANCELLED" })}
          disabled={loading}
          className="flex-1 md:flex-none h-11 px-6 rounded-[8px] border border-red-200 text-red-600 hover:bg-red-50 font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Cancel Order
        </button>
      </>
    );
  }

  if (status === "PROCESSING") {
    return (
      <button
        onClick={() => onPatch({ status: "READY" })}
        disabled={loading}
        className="flex-1 md:flex-none h-11 px-6 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Mark Ready
      </button>
    );
  }

  if (status === "READY") {
    return (
      <button
        onClick={() => onPatch({ status: "DELIVERED" })}
        disabled={loading}
        className="flex-1 md:flex-none h-11 px-6 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Mark Delivered
      </button>
    );
  }

  return null;
}

function ProcessOrderModal({
  orderId,
  warehouses,
  shops,
  onClose,
  onSuccess,
}: {
  orderId: string;
  warehouses: { id: string; name: string; type: string }[];
  shops: { id: string; name: string; warehouseName: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [locationType, setLocationType] = useState<"warehouse" | "shop">("warehouse");
  const [warehouseId, setWarehouseId] = useState("");
  const [shopId, setShopId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locationType === "warehouse" && !warehouseId) {
      setError("Please select a warehouse.");
      return;
    }
    if (locationType === "shop" && !shopId) {
      setError("Please select a shop.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { status: "PROCESSING" };
      if (note.trim()) body.note = note.trim();
      if (locationType === "warehouse") body.warehouseId = warehouseId;
      else body.shopId = shopId;

      const res = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error ?? "Failed to process order");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        {/* Modal header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-agro-dark">Process Order</h2>
            <p className="font-body text-sm text-muted mt-0.5">Select where this order will be fulfilled from</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Location type toggle */}
          <div>
            <label className="block font-body text-xs text-muted mb-2">Location Type</label>
            <div className="flex rounded-[8px] border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => { setLocationType("warehouse"); setShopId(""); }}
                disabled={saving}
                className={cn(
                  "flex-1 h-11 font-body text-sm font-medium transition-colors",
                  locationType === "warehouse"
                    ? "bg-agro-dark text-white"
                    : "bg-white text-agro-dark hover:bg-gray-50"
                )}
              >
                Warehouse
              </button>
              <button
                type="button"
                onClick={() => { setLocationType("shop"); setWarehouseId(""); }}
                disabled={saving}
                className={cn(
                  "flex-1 h-11 font-body text-sm font-medium transition-colors border-l border-gray-200",
                  locationType === "shop"
                    ? "bg-agro-dark text-white"
                    : "bg-white text-agro-dark hover:bg-gray-50"
                )}
              >
                Shop
              </button>
            </div>
          </div>

          {/* Warehouse or Shop select */}
          {locationType === "warehouse" ? (
            <div>
              <label className="block font-body text-xs text-muted mb-1">Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={saving}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Select warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} — {w.type.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-body text-xs text-muted mb-1">Shop</label>
              <select
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                disabled={saving}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Select shop...</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.warehouseName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Add a note about this fulfillment..."
              className="w-full px-3 py-2 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-body">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Processing..." : "Confirm & Process →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
