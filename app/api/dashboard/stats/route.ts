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
      todaySalesResult,
      overdueCredits,
      pendingTransfers,
      stockValue,
      lowStockRaw,
    ] = await Promise.all([
      db.order.count({
        where: { createdAt: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" } },
      }),
      db.payment.aggregate({
        where: { status: "PAID", confirmedAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      db.sale.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true },
      }),
      db.creditSale.count({
        where: {
          status: { in: ["OVERDUE", "ACTIVE"] },
          dueDate: { lt: today },
        },
      }),
      db.stockTransfer.count({ where: { status: "PENDING" } }),
      db.warehouseStock.findMany({
        where: { quantity: { gt: 0 } },
        include: { product: { select: { costPrice: true } } },
      }),
      db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.is_active = true
        AND (
          EXISTS (
            SELECT 1 FROM warehouse_stocks ws
            WHERE ws.product_id = p.id AND ws.quantity <= p.low_stock_threshold
          )
          OR EXISTS (
            SELECT 1 FROM shop_stocks ss
            WHERE ss.product_id = p.id AND ss.quantity <= p.low_stock_threshold
          )
        )
      `,
    ]);

    const lowStockItems = Number(lowStockRaw[0]?.count ?? 0);
    const paymentRevenue = revenueResult._sum.amount?.toNumber() ?? 0;
    const salesRevenue = todaySalesResult._sum.total?.toNumber() ?? 0;
    const totalStockValue = stockValue.reduce(
      (sum, s) => sum + s.quantity * s.product.costPrice.toNumber(),
      0
    );

    const stats: DashboardStats = {
      todayOrders,
      todayRevenue: paymentRevenue + salesRevenue,
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
