import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { ReportsClient } from "./reports-client";

async function getReportData(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [
    orderRevenue,
    salesRevenue,
    creditRevenue,
    orders,
    creditSales,
    paidPayments,
    topProducts,
    attendanceRecords,
    staffSalesRecords,
  ] = await Promise.all([
    db.payment.aggregate({
      where: { status: "PAID", source: "ORDER", confirmedAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.aggregate({
      where: { status: "PAID", source: "SALE", createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.aggregate({
      where: { status: "PAID", source: "CREDIT_PAYMENT", confirmedAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    db.creditSale.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    db.payment.findMany({
      where: { status: "PAID", confirmedAt: { gte: since } },
      select: { amount: true, source: true, confirmedAt: true },
      orderBy: { confirmedAt: "asc" },
    }),
    db.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { createdAt: { gte: since } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    db.attendance.findMany({
      where: { clockIn: { gte: since } },
      include: { user: { select: { name: true, roleName: true } } },
    }),
    db.sale.findMany({
      where: { createdAt: { gte: since } },
      select: {
        cashierId: true,
        total: true,
        paymentMethod: true,
        cashier: { select: { name: true, roleName: true } },
      },
    }),
  ]);

  // Resolve product names
  const productIds = topProducts.map((p) => p.productId);
  const products = productIds.length > 0
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  // Daily revenue buckets
  const dailyMap: Record<string, number> = {};
  for (const p of paidPayments) {
    const day = p.confirmedAt!.toISOString().split("T")[0];
    dailyMap[day] = (dailyMap[day] ?? 0) + p.amount.toNumber();
  }
  const dailyRevenue = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));

  // Staff attendance summary
  const staffMap: Record<string, { name: string; role: string; sessions: number; totalMinutes: number }> = {};
  for (const rec of attendanceRecords) {
    const uid = rec.userId;
    if (!staffMap[uid]) {
      staffMap[uid] = { name: rec.user.name, role: rec.user.roleName, sessions: 0, totalMinutes: 0 };
    }
    staffMap[uid].sessions += 1;
    if (rec.clockOut) {
      const ms = rec.clockOut.getTime() - rec.clockIn.getTime();
      staffMap[uid].totalMinutes += Math.floor(ms / 60000);
    }
  }

  // Staff sales performance aggregation
  const staffSalesMap: Record<string, {
    name: string;
    role: string;
    totalSales: number;
    transactionCount: number;
    paymentMethods: Record<string, number>;
  }> = {};
  for (const sale of staffSalesRecords) {
    const uid = sale.cashierId;
    if (!staffSalesMap[uid]) {
      staffSalesMap[uid] = {
        name: sale.cashier.name,
        role: sale.cashier.roleName,
        totalSales: 0,
        transactionCount: 0,
        paymentMethods: {},
      };
    }
    const entry = staffSalesMap[uid];
    entry.totalSales += sale.total.toNumber();
    entry.transactionCount += 1;
    entry.paymentMethods[sale.paymentMethod] = (entry.paymentMethods[sale.paymentMethod] ?? 0) + 1;
  }

  const orderTotal = orderRevenue._sum.amount?.toNumber() ?? 0;
  const salesTotal = salesRevenue._sum.amount?.toNumber() ?? 0;
  const creditTotal = creditRevenue._sum.amount?.toNumber() ?? 0;
  const totalRevenue = orderTotal + salesTotal + creditTotal;

  return {
    totalRevenue,
    breakdown: {
      orders: { total: orderTotal, count: orderRevenue._count },
      sales: { total: salesTotal, count: salesRevenue._count },
      credit: { total: creditTotal, count: creditRevenue._count },
    },
    orderStats: Object.fromEntries(orders.map((o) => [o.status, o._count])) as Record<string, number>,
    creditStats: Object.fromEntries(creditSales.map((c) => [c.status, c._count])) as Record<string, number>,
    dailyRevenue,
    topProducts: topProducts.map((p) => ({
      name: productMap[p.productId] ?? "Unknown",
      quantity: p._sum.quantity ?? 0,
      total: p._sum.total?.toNumber() ?? 0,
    })),
    staffAttendance: Object.values(staffMap).sort((a, b) => b.totalMinutes - a.totalMinutes),
    staffSalesPerformance: Object.values(staffSalesMap).sort((a, b) => b.totalSales - a.totalSales),
  };
}

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.reports.view) redirect("/dashboard");

  // Default: last 30 days
  const data = await getReportData(30);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-agro-dark">Reports</h1>
        <p className="font-body text-sm text-muted mt-0.5">Revenue summaries, order trends, and staff insights</p>
      </div>

      {/* Quick revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <p className="font-body text-xs text-muted mb-2">Total Revenue (30d)</p>
          <p className="font-display font-bold text-2xl text-primary">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <p className="font-body text-xs text-muted mb-2">Orders (30d)</p>
          <p className="font-display font-bold text-2xl text-agro-dark">{formatCurrency(data.breakdown.orders.total)}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <p className="font-body text-xs text-muted mb-2">Credit Repayments (30d)</p>
          <p className="font-display font-bold text-2xl text-agro-dark">{formatCurrency(data.breakdown.credit.total)}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <p className="font-body text-xs text-muted mb-2">Walk-in Sales (30d)</p>
          <p className="font-display font-bold text-2xl text-agro-dark">{formatCurrency(data.breakdown.sales.total)}</p>
        </div>
      </div>

      <ReportsClient initialData={data} />
    </div>
  );
}
