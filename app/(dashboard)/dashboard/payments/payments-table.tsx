"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface SerializedPayment {
  id: string;
  reference: string;
  amount: number;
  method: string;
  source: string;
  status: string;
  valuepayRef: string | null;
  notes: string | null;
  confirmedAt: string | null;
  createdAt: string;
  orderId: string | null;
  saleId: string | null;
  order: {
    orderCode: string;
    customerName: string;
    createdAt: string;
  } | null;
  sale: {
    id: string;
    createdAt: string;
  } | null;
}

const SOURCE_BADGE: Record<string, string> = {
  ORDER: "bg-blue-50 text-blue-600",
  SALE: "bg-gray-100 text-muted",
  CREDIT: "bg-amber-50 text-amber-600",
};

const SOURCE_LABEL: Record<string, string> = {
  ORDER: "Order",
  SALE: "Sale",
  CREDIT: "Credit",
};

const STATUS_BADGE: Record<string, string> = {
  PAID: "bg-green-50 text-status-confirmed",
  UNPAID: "bg-amber-50 text-status-pending",
  PARTIAL: "bg-blue-50 text-blue-600",
  REFUNDED: "bg-gray-100 text-muted",
};

function getCustomerName(p: SerializedPayment): string {
  return p.order?.customerName ?? "—";
}

function getOrderCode(p: SerializedPayment): string {
  return p.order?.orderCode ?? p.sale?.id?.slice(0, 8) ?? "—";
}

function MarkPaidButton({ payment, role }: { payment: SerializedPayment; role: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canMark =
    payment.status === "UNPAID" &&
    (role === "SUPER_ADMIN" || role === "MANAGER");

  if (!canMark) return null;

  async function handleMarkPaid() {
    setLoading(true);
    try {
      await fetch(`/api/dashboard/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      router.refresh();
    } catch {
      // silent — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleMarkPaid}
      disabled={loading}
      className="h-9 px-3 rounded-[8px] bg-primary text-white font-body text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 active:scale-[0.97] whitespace-nowrap flex items-center gap-1.5"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {loading ? "Saving..." : "Mark Paid"}
    </button>
  );
}

export function PaymentsTable({
  payments,
  role,
}: {
  payments: SerializedPayment[];
  role: string;
}) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card py-16 text-center">
        <p className="font-body text-muted">No payment records found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-body text-base font-semibold text-agro-dark leading-tight truncate">
                  {getCustomerName(p)}
                </p>
                <p className="font-body text-xs text-muted mt-0.5 font-mono">
                  {getOrderCode(p)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-body font-medium px-2.5 py-1 rounded-[6px]",
                  SOURCE_BADGE[p.source] ?? "bg-gray-100 text-muted"
                )}
              >
                {SOURCE_LABEL[p.source] ?? p.source}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-xs font-body font-medium px-2.5 py-1 rounded-[6px]",
                    STATUS_BADGE[p.status] ?? "bg-gray-100 text-muted"
                  )}
                >
                  {p.status}
                </span>
                <span className="font-body text-xs text-muted">{p.method}</span>
              </div>
              <span className="font-display font-bold text-lg text-agro-dark">
                {formatCurrency(p.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="font-body text-xs text-muted">
                {formatDate(new Date(p.createdAt))}
              </p>
              <MarkPaidButton payment={p} role={role} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[
                  "Type",
                  "Customer",
                  "Order Code",
                  "Amount",
                  "Method",
                  "Status",
                  "Date",
                  "Actions",
                ].map((h) => (
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
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-body font-medium px-2 py-0.5 rounded-[6px] whitespace-nowrap",
                        SOURCE_BADGE[p.source] ?? "bg-gray-100 text-muted"
                      )}
                    >
                      {SOURCE_LABEL[p.source] ?? p.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm font-medium text-agro-dark">
                      {getCustomerName(p)}
                    </p>
                    {p.notes && (
                      <p className="font-body text-xs text-muted truncate max-w-[160px]">
                        {p.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-body text-xs text-muted font-mono tracking-wider">
                      {getOrderCode(p)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-display font-semibold text-sm text-agro-dark">
                      {formatCurrency(p.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-body text-sm text-agro-dark">{p.method}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-body font-medium px-2 py-0.5 rounded-[6px] whitespace-nowrap",
                        STATUS_BADGE[p.status] ?? "bg-gray-100 text-muted"
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted whitespace-nowrap">
                    {formatDate(new Date(p.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <MarkPaidButton payment={p} role={role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
