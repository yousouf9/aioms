import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditDetailActions } from "./credit-detail-actions";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DEFAULTED: "bg-red-200 text-red-800",
  RETURNED: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  DEFAULTED: "Defaulted",
  RETURNED: "Returned",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  TRANSFER: "Bank Transfer",
  POS: "POS (Card)",
  ONLINE: "Online Payment",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  OTHER: "Other",
};

export default async function CreditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [credit, warehouses, shops] = await Promise.all([
    db.creditSale.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
        payments: {
          orderBy: { createdAt: "desc" },
          include: { recordedBy: { select: { name: true } } },
        },
        createdBy: { select: { name: true } },
      },
    }),
    db.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!credit) redirect("/dashboard/credit");

  const now = new Date();
  const isOverdue = credit.status === "ACTIVE" && credit.dueDate && credit.dueDate < now;
  if (isOverdue) {
    await db.creditSale.update({ where: { id }, data: { status: "OVERDUE" } });
    (credit as typeof credit & { status: string }).status = "OVERDUE";
  }

  const totalAmount = credit.totalAmount.toNumber();
  const paidAmount = credit.paidAmount.toNumber();
  const outstanding = credit.status === "RETURNED" ? 0 : totalAmount - paidAmount;

  // Serialize for client components
  const serializedCredit = {
    id: credit.id,
    customerId: credit.customerId,
    creditType: credit.creditType,
    totalAmount,
    paidAmount,
    dueDate: credit.dueDate?.toISOString() ?? null,
    season: credit.season,
    status: credit.status as "ACTIVE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "DEFAULTED" | "RETURNED",
    returnedToInventory: credit.returnedToInventory,
    notes: credit.notes,
    createdAt: credit.createdAt.toISOString(),
    updatedAt: credit.updatedAt.toISOString(),
    customer: credit.customer,
    items: credit.items.map((i) => ({
      id: i.id,
      creditSaleId: i.creditSaleId,
      productId: i.productId,
      product: { name: i.product.name },
      quantity: i.quantity,
      unitPrice: i.unitPrice.toNumber(),
      total: i.total.toNumber(),
    })),
    payments: credit.payments.map((p) => ({
      id: p.id,
      creditSaleId: p.creditSaleId,
      customerId: p.customerId,
      amount: p.amount.toNumber(),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      recordedBy: p.recordedBy?.name ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  const dueDateStr = credit.dueDate?.toISOString() ?? null;
  const isDueDateOverdue = dueDateStr ? new Date(dueDateStr) < now : false;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back link */}
      <Link
        href="/dashboard/credit"
        className="inline-flex items-center gap-1.5 text-sm font-body text-muted hover:text-agro-dark transition-colors"
      >
        ← Credit & Debt
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl text-agro-dark">{credit.customer.name}</h1>
            <p className="text-muted text-sm mt-0.5">{credit.customer.phone}</p>
            <p className="text-muted text-xs mt-1">Created {formatDate(credit.createdAt)} by {credit.createdBy?.name ?? "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-[6px] text-xs font-medium ${STATUS_COLORS[credit.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[credit.status] ?? credit.status}
            </span>
            <span className={`px-2.5 py-1 rounded-[6px] text-xs font-medium ${credit.creditType === "FIXED_DATE" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
              {credit.creditType === "FIXED_DATE" ? "Fixed Date" : "Seasonal"}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="p-3 rounded-[8px] bg-gray-50 text-center">
            <p className="text-xs text-muted font-body">Total</p>
            <p className="font-display font-bold text-agro-dark mt-0.5">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="p-3 rounded-[8px] bg-green-50 text-center">
            <p className="text-xs text-muted font-body">Paid</p>
            <p className="font-display font-bold text-green-700 mt-0.5">{formatCurrency(paidAmount)}</p>
          </div>
          <div className="p-3 rounded-[8px] bg-red-50 text-center">
            <p className="text-xs text-muted font-body">Outstanding</p>
            <p className="font-display font-bold text-red-700 mt-0.5">{formatCurrency(outstanding)}</p>
          </div>
        </div>

        {/* Due / season info */}
        {dueDateStr && (
          <p className={`mt-3 text-sm font-body ${isDueDateOverdue ? "text-red-700 font-medium" : "text-muted"}`}>
            Due: {formatDate(dueDateStr)} {isDueDateOverdue && "· Overdue"}
          </p>
        )}
        {credit.season && (
          <p className="mt-1 text-sm font-body text-muted">Season: {credit.season}</p>
        )}
        {credit.notes && (
          <p className="mt-1 text-sm font-body text-muted">Notes: {credit.notes}</p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-display font-semibold text-agro-dark">Items</h2>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Product</th>
                <th className="text-right px-5 py-3 font-display font-semibold text-agro-dark">Qty</th>
                <th className="text-right px-5 py-3 font-display font-semibold text-agro-dark">Unit Price</th>
                <th className="text-right px-5 py-3 font-display font-semibold text-agro-dark">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {credit.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-agro-dark font-medium">{item.product.name}</td>
                  <td className="px-5 py-3 text-right text-muted">{item.quantity} {item.product.unit}</td>
                  <td className="px-5 py-3 text-right text-muted">{formatCurrency(item.unitPrice.toNumber())}</td>
                  <td className="px-5 py-3 text-right font-display font-semibold text-agro-dark">{formatCurrency(item.total.toNumber())}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={3} className="px-5 py-3 text-right font-display font-semibold text-agro-dark">Total</td>
                <td className="px-5 py-3 text-right font-display font-bold text-agro-dark">{formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-100">
          {credit.items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-agro-dark text-sm">{item.product.name}</p>
                <p className="text-muted text-xs mt-0.5">{item.quantity} {item.product.unit} × {formatCurrency(item.unitPrice.toNumber())}</p>
              </div>
              <p className="font-display font-semibold text-agro-dark">{formatCurrency(item.total.toNumber())}</p>
            </div>
          ))}
          <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
            <p className="font-display font-semibold text-agro-dark">Total</p>
            <p className="font-display font-bold text-agro-dark">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {credit.payments.length > 0 && (
        <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-display font-semibold text-agro-dark">Payment History</h2>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Date</th>
                  <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Amount</th>
                  <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Method</th>
                  <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Reference</th>
                  <th className="text-left px-5 py-3 font-display font-semibold text-agro-dark">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credit.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-3 font-display font-semibold text-green-700">{formatCurrency(p.amount.toNumber())}</td>
                    <td className="px-5 py-3 text-muted">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-5 py-3 text-muted">{p.reference ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{(p as typeof p & { recordedBy?: { name: string } | null }).recordedBy?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {credit.payments.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold text-green-700">{formatCurrency(p.amount.toNumber())}</p>
                  <p className="text-muted text-xs">{formatDate(p.createdAt)}</p>
                </div>
                <p className="text-muted text-xs mt-0.5">{METHOD_LABELS[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <CreditDetailActions
        credit={serializedCredit}
        warehouses={warehouses}
        shops={shops}
      />
    </div>
  );
}
