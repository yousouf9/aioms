import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { PaymentsTable } from "./payments-table";

async function getPaymentsData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [payments, totalPaidResult, todayPaidResult, pendingCount] =
    await Promise.all([
      db.payment.findMany({
        include: {
          order: { select: { orderCode: true, customerName: true, createdAt: true } },
          sale: { select: { id: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.payment.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: {
          status: "PAID",
          confirmedAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      db.payment.count({ where: { status: "UNPAID" } }),
    ]);

  return {
    payments,
    totalPaid: totalPaidResult._sum.amount?.toNumber() ?? 0,
    todayPaid: todayPaidResult._sum.amount?.toNumber() ?? 0,
    pendingCount,
    totalRecords: payments.length,
  };
}

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.payments.view) redirect("/dashboard");

  const data = await getPaymentsData();

  // Serialize Decimal / Date fields before passing to client component
  const serializedPayments = data.payments.map((p) => ({
    ...p,
    amount: p.amount.toNumber(),
    createdAt: p.createdAt.toISOString(),
    confirmedAt: p.confirmedAt?.toISOString() ?? null,
    order: p.order
      ? { ...p.order, createdAt: p.order.createdAt.toISOString() }
      : null,
    sale: p.sale
      ? { ...p.sale, createdAt: p.sale.createdAt.toISOString() }
      : null,
  }));

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(data.totalPaid),
      accent: "text-primary",
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(data.todayPaid),
      accent: "text-primary",
    },
    {
      label: "Pending Payments",
      value: String(data.pendingCount),
      accent: data.pendingCount > 0 ? "text-status-pending" : "text-muted",
    },
    {
      label: "Total Records",
      value: String(data.totalRecords),
      accent: "text-agro-dark",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-agro-dark">
          Payments
        </h1>
        <p className="font-body text-sm text-muted mt-0.5">
          Track and manage all payment records
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5"
          >
            <p className="font-body text-xs text-muted mb-2">{s.label}</p>
            <p className={`font-display font-bold text-2xl ${s.accent}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <PaymentsTable payments={serializedPayments} role={session.role} />
    </div>
  );
}
