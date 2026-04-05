import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse, DashboardStats } from "@/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayOrders,
      revenueResult,
      lowStockItems,
      overdueCredits,
      pendingTransfers,
      stockValue,
    ] = await Promise.all([
      db.order.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      db.payment.aggregate({
        where: {
          status: "PAID",
          confirmedAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      db.shopStock.count({
        where: {
          quantity: { lte: 5 },
          product: { isActive: true },
        },
      }),
      db.creditSale.count({
        where: {
          status: { in: ["OVERDUE", "ACTIVE"] },
          dueDate: { lt: today },
        },
      }),
      db.stockTransfer.count({
        where: { status: "PENDING" },
      }),
      db.warehouseStock.findMany({
        where: { quantity: { gt: 0 } },
        include: { product: { select: { costPrice: true } } },
      }),
    ]);

    const totalStockValue = stockValue.reduce(
      (sum, s) => sum + s.quantity * s.product.costPrice.toNumber(),
      0
    );

    const stats: DashboardStats = {
      todayOrders,
      todayRevenue: revenueResult._sum.amount?.toNumber() ?? 0,
      lowStockCount: lowStockItems,
      overdueCredits,
      pendingTransfers,
      totalStockValue,
    };

    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[STATS]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
