import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DEFAULTED: "bg-red-200 text-red-800",
  RETURNED: "bg-gray-100 text-gray-600",
};

export default async function CreditPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const credits = await db.creditSale.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
      _count: { select: { payments: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="font-display text-xl font-bold text-agro-dark">Credit & Debt</h1>
      </div>

      {credits.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">No credit sales yet. Record credit sales when customers take products on loan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map((c) => {
            const outstanding = Number(c.totalAmount) - Number(c.paidAmount);
            return (
              <div key={c.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-semibold text-agro-dark">{c.customer.name}</p>
                    <p className="text-muted text-xs">{c.customer.phone} &middot; {c.creditType === "FIXED_DATE" ? "Fixed Date" : "Seasonal"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                  <div className="p-2 rounded-[8px] bg-gray-50">
                    <p className="text-xs text-muted">Total</p>
                    <p className="font-display font-semibold text-sm">{formatCurrency(c.totalAmount)}</p>
                  </div>
                  <div className="p-2 rounded-[8px] bg-green-50">
                    <p className="text-xs text-muted">Paid</p>
                    <p className="font-display font-semibold text-sm text-green-700">{formatCurrency(c.paidAmount)}</p>
                  </div>
                  <div className="p-2 rounded-[8px] bg-red-50">
                    <p className="text-xs text-muted">Outstanding</p>
                    <p className="font-display font-semibold text-sm text-red-700">{formatCurrency(outstanding)}</p>
                  </div>
                </div>
                {c.dueDate && (
                  <p className="text-xs text-muted mt-2">Due: {formatDate(c.dueDate)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
