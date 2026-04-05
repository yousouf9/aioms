"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Hash,
  AtSign,
  CheckCircle2,
  Package,
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

const ORDER_STEPS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "DELIVERED",
] as const;

interface OrderResult {
  orderCode: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  total: number;
  deliveryMethod: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
}

export default function FindOrderPage() {
  const [code, setCode] = useState("");
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/public/orders/track?code=${encodeURIComponent(code)}&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Order not found");
      } else {
        setOrder(data.data);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const activeStepIndex = order
    ? ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number])
    : -1;

  const showProgress =
    order &&
    order.status !== "DELIVERED" &&
    order.status !== "CANCELLED" &&
    activeStepIndex !== -1;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Hero */}
      <div className="bg-agro-dark rounded-[12px] p-8 text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Search className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-frost-white">
          Find Your Order
        </h1>
        <p className="text-muted text-sm mt-2">
          Enter your order code and email or phone number to check your order
          status.
        </p>
      </div>

      {/* Search form card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 space-y-4"
      >
        {/* Order code input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Hash className="h-4 w-4 text-muted" />
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            placeholder="AGR-XXXXXX"
            className="w-full h-11 pl-10 pr-4 rounded-[8px] bg-white border border-gray-200 text-agro-dark text-sm font-mono focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Email or phone input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AtSign className="h-4 w-4 text-muted" />
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            required
            placeholder="Email or phone number"
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
          {loading ? "Searching..." : "Find Order"}
        </button>
      </form>

      {/* Result card */}
      {order && (
        <div className="mt-6 bg-white rounded-[12px] border border-gray-200 shadow-card p-5 animate-fade-up">
          {/* Order code + status */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-mono text-primary font-bold text-sm">
                {order.orderCode}
              </p>
              <p className="text-agro-dark font-medium text-sm mt-0.5">
                {order.customerName}
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-[6px] text-xs font-medium ${
                STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {order.status}
            </span>
          </div>

          {/* Delivery method */}
          <div className="mb-3">
            <span className="px-2 py-0.5 rounded-[6px] text-xs bg-gray-100 text-gray-600 capitalize">
              {order.deliveryMethod.toLowerCase()}
            </span>
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div className="mb-4 pt-3 border-t border-gray-100">
              <p className="text-muted text-xs font-body mb-3">Order progress</p>
              <div className="flex items-center">
                {ORDER_STEPS.map((step, idx) => {
                  const isCompleted = idx < activeStepIndex;
                  const isActive = idx === activeStepIndex;
                  const isFuture = idx > activeStepIndex;

                  return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`rounded-full h-2.5 w-2.5 shrink-0 transition-colors ${
                            isCompleted
                              ? "bg-green-500"
                              : isActive
                              ? "bg-primary"
                              : isFuture
                              ? "bg-gray-200"
                              : "bg-gray-200"
                          }`}
                        />
                        <span
                          className={`text-[9px] font-body capitalize hidden sm:block ${
                            isActive
                              ? "text-primary font-semibold"
                              : isCompleted
                              ? "text-green-600"
                              : "text-muted"
                          }`}
                        >
                          {step.charAt(0) + step.slice(1).toLowerCase()}
                        </span>
                      </div>
                      {idx < ORDER_STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-1 transition-colors ${
                            idx < activeStepIndex ? "bg-green-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items list */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted shrink-0" />
                  <span className="text-agro-dark">
                    {item.name}{" "}
                    <span className="text-muted text-xs">x{item.quantity}</span>
                  </span>
                </div>
                <span className="text-muted text-xs font-medium">
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
            <span className="font-display font-bold text-agro-dark">Total</span>
            <span className="font-display font-bold text-accent text-lg">
              {formatCurrency(order.total)}
            </span>
          </div>

          {/* Payment status + date */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-muted text-xs font-body">
              {formatDate(order.createdAt)}
            </span>
            <div className="flex items-center gap-1.5">
              {order.paymentStatus === "PAID" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              )}
              <span
                className={`px-2.5 py-0.5 rounded-[6px] text-xs font-medium ${
                  PAYMENT_COLORS[order.paymentStatus] ||
                  "bg-gray-100 text-gray-600"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cross-link */}
      <div className="bg-gray-50 rounded-[12px] border border-gray-100 p-5 mt-6 text-center">
        <p className="text-muted text-sm mb-3">Have multiple orders?</p>
        <Link
          href="/track-order"
          className="flex items-center justify-center w-full h-11 rounded-[8px] border border-gray-200 bg-white text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors"
        >
          View all orders by email/phone →
        </Link>
      </div>
    </div>
  );
}
