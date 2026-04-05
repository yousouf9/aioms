"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Mail,
  Phone,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-green-200 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: "bg-gray-100 text-gray-600",
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
};

interface OrderRow {
  orderCode: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  total: number;
  deliveryMethod: string;
  createdAt: string;
  itemCount: number;
  items: { name: string; quantity: number; total: number }[];
}

export default function MyOrdersPage() {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(code: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOrders(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/public/orders/mine?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "No orders found");
      } else {
        setOrders(data.data);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Hero */}
      <div className="bg-agro-dark rounded-[12px] p-8 text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-frost-white">
          My Orders
        </h1>
        <p className="text-muted text-sm mt-2">
          Enter your email or phone number to view all your orders.
        </p>
      </div>

      {/* Search form card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 space-y-4"
      >
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("email");
              setQ("");
            }}
            className={`h-10 rounded-[8px] flex-1 font-body text-sm font-medium border transition-colors ${
              mode === "email"
                ? "bg-agro-dark text-white border-transparent"
                : "bg-white text-agro-dark border-gray-200"
            }`}
          >
            Email Address
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setQ("");
            }}
            className={`h-10 rounded-[8px] flex-1 font-body text-sm font-medium border transition-colors ${
              mode === "phone"
                ? "bg-agro-dark text-white border-transparent"
                : "bg-white text-agro-dark border-gray-200"
            }`}
          >
            Phone Number
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {mode === "email" ? (
              <Mail className="h-4 w-4 text-muted" />
            ) : (
              <Phone className="h-4 w-4 text-muted" />
            )}
          </span>
          <input
            type={mode === "email" ? "email" : "tel"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            required
            placeholder={
              mode === "email" ? "e.g. ibrahim@email.com" : "e.g. 08012345678"
            }
            className="w-full h-11 pl-10 pr-4 rounded-[8px] bg-white border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 text-xs py-2 px-3 rounded-[6px]">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" />
          {loading ? "Searching..." : "Search Orders"}
        </button>
      </form>

      {/* Results */}
      {orders !== null && (
        <div className="mt-6 space-y-3">
          <p className="text-muted text-xs font-body px-1">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </p>

          {orders.length === 0 ? (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-8 text-center">
              <p className="text-muted text-sm">No orders to display.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.orderCode}
                className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5"
              >
                {/* Row 1: code + status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-primary font-bold text-sm">
                    {order.orderCode}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-[6px] text-xs font-medium ${
                      STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Row 2: customer name + delivery */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-agro-dark text-sm font-medium truncate">
                    {order.customerName}
                  </span>
                  <span className="px-2 py-0.5 rounded-[6px] text-xs bg-gray-100 text-gray-600 capitalize shrink-0">
                    {order.deliveryMethod.toLowerCase()}
                  </span>
                </div>

                {/* Row 3: item count + total */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted text-xs font-body">
                    {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                  </span>
                  <span className="font-display font-bold text-accent text-sm">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                {/* Row 4: date + payment status */}
                <div className="flex items-center justify-between">
                  <span className="text-muted text-xs font-body">
                    {formatDate(order.createdAt)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-[6px] text-xs font-medium ${
                      PAYMENT_COLORS[order.paymentStatus] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                {/* Expandable items */}
                <button
                  type="button"
                  onClick={() => toggleExpand(order.orderCode)}
                  className="mt-3 flex items-center gap-1 text-xs text-muted font-body hover:text-agro-dark transition-colors"
                >
                  {expandedIds.has(order.orderCode) ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide items
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show items
                    </>
                  )}
                </button>

                {expandedIds.has(order.orderCode) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-agro-dark">
                          {item.name}{" "}
                          <span className="text-muted">x{item.quantity}</span>
                        </span>
                        <span className="text-muted font-medium">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Cross-link */}
      <div className="bg-gray-50 rounded-[12px] border border-gray-100 p-5 mt-6 text-center">
        <p className="text-muted text-sm mb-3">Looking for a specific order?</p>
        <Link
          href="/track-order/find"
          className="flex items-center justify-center w-full h-11 rounded-[8px] border border-gray-200 bg-white text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors"
        >
          Track by order code →
        </Link>
      </div>
    </div>
  );
}
