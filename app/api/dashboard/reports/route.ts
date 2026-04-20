import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "reports", "view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "30";
    const days = Math.min(365, Math.max(1, parseInt(period) || 30));

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [
      orderRevenue,
      salesRevenue,
      creditRevenue,
      orders,
      payments,
      topProducts,
      attendanceSummary,
      staffSales,
      creditSalesGrouped,
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
        where: { status: "PAID", source: "CREDIT_PAYMENT", createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
      }),
      db.order.groupBy({
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
        take: 10,
      }),
      db.attendance.findMany({
        where: { clockIn: { gte: since } },
        include: { user: { select: { name: true, roleName: true } } },
        orderBy: { clockIn: "desc" },
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
      db.creditSale.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    // Resolve top product names
    const productIds = topProducts.map((p) => p.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    // Daily revenue
    const dailyMap: Record<string, number> = {};
    for (const p of payments) {
      const day = p.confirmedAt!.toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + p.amount.toNumber();
    }
    const dailyRevenue = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));

    // Attendance hours
    const staffHours: Record<string, { name: string; role: string; sessions: number; totalMinutes: number }> = {};
    for (const rec of attendanceSummary) {
      const uid = rec.userId;
      if (!staffHours[uid]) {
        staffHours[uid] = { name: rec.user.name, role: rec.user.roleName, sessions: 0, totalMinutes: 0 };
      }
      staffHours[uid].sessions += 1;
      if (rec.clockOut) {
        const ms = rec.clockOut.getTime() - rec.clockIn.getTime();
        staffHours[uid].totalMinutes += Math.floor(ms / 60000);
      }
    }

    // Staff sales
    const staffSalesMap: Record<string, { name: string; role: string; totalSales: number; transactionCount: number; paymentMethods: Record<string, number> }> = {};
    for (const sale of staffSales) {
      const uid = sale.cashierId;
      if (!staffSalesMap[uid]) {
        staffSalesMap[uid] = { name: sale.cashier.name, role: sale.cashier.roleName, totalSales: 0, transactionCount: 0, paymentMethods: {} };
      }
      const entry = staffSalesMap[uid];
      entry.totalSales += sale.total.toNumber();
      entry.transactionCount += 1;
      entry.paymentMethods[sale.paymentMethod] = (entry.paymentMethods[sale.paymentMethod] ?? 0) + 1;
    }

    const totalRevenue =
      (orderRevenue._sum.amount?.toNumber() ?? 0) +
      (salesRevenue._sum.amount?.toNumber() ?? 0) +
      (creditRevenue._sum.amount?.toNumber() ?? 0);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        period: days,
        totalRevenue,
        breakdown: {
          orders: { total: orderRevenue._sum.amount?.toNumber() ?? 0, count: orderRevenue._count },
          sales: { total: salesRevenue._sum.amount?.toNumber() ?? 0, count: salesRevenue._count },
          credit: { total: creditRevenue._sum.amount?.toNumber() ?? 0, count: creditRevenue._count },
        },
        orderStats: Object.fromEntries(orders.map((o) => [o.status, o._count])),
        creditStats: Object.fromEntries(creditSalesGrouped.map((c) => [c.status, c._count])),
        dailyRevenue,
        topProducts: topProducts.map((p) => ({
          name: productMap[p.productId] ?? "Unknown",
          quantity: p._sum.quantity ?? 0,
          total: p._sum.total?.toNumber() ?? 0,
        })),
        staffAttendance: Object.values(staffHours).sort((a, b) => b.totalMinutes - a.totalMinutes),
        staffSalesPerformance: Object.values(staffSalesMap).sort((a, b) => b.totalSales - a.totalSales),
      },
    });
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
