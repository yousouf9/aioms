import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ClipboardList, TrendingUp, AlertTriangle, ArrowRightLeft,
  CreditCard, Package, Users, Warehouse,
} from "lucide-react";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    ordersToday,
    revenueResult,
    salesResult,
    lowStockProducts,
    overdueCredits,
    pendingTransfers,
    recentOrders,
    recentPayments,
  ] = await Promise.all([
    db.order.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "CANCELLED" },
      },
    }),
    db.payment.aggregate({
      where: {
        status: "PAID",
        confirmedAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    }),
    db.sale.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { total: true },
    }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT p.id) as count FROM products p
      WHERE p."isActive" = true AND (
        EXISTS (SELECT 1 FROM warehouse_stocks ws WHERE ws."productId" = p.id AND ws.quantity <= p."lowStockThreshold")
        OR EXISTS (SELECT 1 FROM shop_stocks ss WHERE ss."productId" = p.id AND ss.quantity <= p."lowStockThreshold")
      )
    `,
    db.creditSale.count({
      where: {
        status: { in: ["ACTIVE", "OVERDUE"] },
        dueDate: { lt: today },
      },
    }),
    db.stockTransfer.count({
      where: { status: "PENDING" },
    }),
    db.order.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderCode: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
    db.payment.findMany({
      where: {
        status: "PAID",
        confirmedAt: { gte: today, lt: tomorrow },
      },
      orderBy: { confirmedAt: "desc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        amount: true,
        method: true,
        source: true,
        confirmedAt: true,
      },
    }),
  ]);

  return {
    ordersToday,
    todayRevenue: (revenueResult._sum.amount?.toNumber() ?? 0) + (salesResult._sum.total?.toNumber() ?? 0),
    lowStockProducts: Number((lowStockProducts as { count: bigint }[])[0]?.count ?? 0),
    overdueCredits,
    pendingTransfers,
    recentOrders,
    recentPayments,
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-green-200 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getDashboardData();
  const canViewFinancials = session.role === "SUPER_ADMIN" || session.role === "MANAGER";

  const stats = [
    {
      label: "Today's Orders",
      value: data.ordersToday,
      icon: ClipboardList,
      color: "text-blue-500 bg-blue-50",
      visible: true,
    },
    {
      label: "Today's Revenue",
      value: canViewFinancials ? formatCurrency(data.todayRevenue) : "—",
      icon: TrendingUp,
      color: "text-green-500 bg-green-50",
      visible: true,
    },
    {
      label: "Low Stock Items",
      value: data.lowStockProducts,
      icon: AlertTriangle,
      color: data.lowStockProducts > 0 ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-50",
      visible: true,
    },
    {
      label: "Overdue Credits",
      value: canViewFinancials ? data.overdueCredits : "—",
      icon: CreditCard,
      color: data.overdueCredits > 0 ? "text-amber-500 bg-amber-50" : "text-gray-400 bg-gray-50",
      visible: canViewFinancials,
    },
  ].filter((s) => s.visible);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-agro-dark">Dashboard Overview</h1>
          <p className="text-muted-dark text-sm">{formatDate(new Date())}</p>
        </div>
        {data.pendingTransfers > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-amber-50 border border-amber-200">
            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 text-xs font-medium">{data.pendingTransfers} pending transfer(s)</span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-agro-dark">
                    {stat.value}
                  </p>
                  <p className="text-muted-dark text-xs">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`grid grid-cols-1 ${canViewFinancials ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* Recent Orders */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <h2 className="font-display font-semibold text-agro-dark text-sm mb-4">Today&apos;s Orders</h2>
          {data.recentOrders.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">No orders today.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-body text-sm font-medium text-agro-dark">{order.customerName}</p>
                    <p className="text-muted text-xs">{order.orderCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-sm text-agro-dark">
                      {formatCurrency(order.total)}
                    </p>
                    <span className={`inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments — managers/admins only */}
        {canViewFinancials && <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <h2 className="font-display font-semibold text-agro-dark text-sm mb-4">Recent Payments</h2>
          {data.recentPayments.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-body text-sm font-medium text-agro-dark">{payment.reference}</p>
                    <p className="text-muted text-xs capitalize">{payment.method.toLowerCase()} &middot; {payment.source.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                  <p className="font-display font-semibold text-sm text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
