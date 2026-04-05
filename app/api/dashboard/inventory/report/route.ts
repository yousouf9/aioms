import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const products = await db.product.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        warehouseStocks: { select: { quantity: true } },
        shopStocks: { select: { quantity: true } },
      },
    });

    const transactions = await db.stockTransaction.findMany({
      where: { createdAt: { gte: since } },
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const saleItems = await db.saleItem.findMany({
      where: { sale: { createdAt: { gte: since } } },
      include: {
        product: { select: { name: true, category: { select: { name: true } } } },
      },
    });

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;

    const productRows = products.map((p) => {
      const warehouseQty = p.warehouseStocks.reduce((s, w) => s + w.quantity, 0);
      const shopQty = p.shopStocks.reduce((s, sh) => s + sh.quantity, 0);
      const totalQty = warehouseQty + shopQty;
      const cost = p.costPrice.toNumber();
      const sell = p.sellingPrice.toNumber();
      return {
        id: p.id,
        name: p.name,
        category: p.category.name,
        unit: p.unit,
        costPrice: cost,
        sellingPrice: sell,
        margin: sell > 0 ? ((sell - cost) / sell * 100) : 0,
        warehouseStock: warehouseQty,
        shopStock: shopQty,
        totalStock: totalQty,
        stockCostValue: totalQty * cost,
        stockSellingValue: totalQty * sell,
        lowStockThreshold: p.lowStockThreshold,
        status: totalQty === 0 ? "OUT_OF_STOCK" : totalQty <= p.lowStockThreshold ? "LOW_STOCK" : "OK",
        isActive: p.isActive,
      };
    });

    const lowStock = productRows.filter((p) => p.status === "LOW_STOCK");
    const outOfStock = productRows.filter((p) => p.status === "OUT_OF_STOCK");
    const totalCostValue = productRows.reduce((s, p) => s + p.stockCostValue, 0);
    const totalSellingValue = productRows.reduce((s, p) => s + p.stockSellingValue, 0);

    const categoryMap: Record<string, { count: number; stockValue: number; lowStock: number }> = {};
    for (const p of productRows) {
      if (!categoryMap[p.category]) categoryMap[p.category] = { count: 0, stockValue: 0, lowStock: 0 };
      categoryMap[p.category].count++;
      categoryMap[p.category].stockValue += p.stockSellingValue;
      if (p.status === "LOW_STOCK") categoryMap[p.category].lowStock++;
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.stockValue - a.stockValue);

    const totalStockIn = transactions.filter((t) => t.type === "IN").reduce((s, t) => s + t.quantity, 0);
    const totalStockOut = transactions.filter((t) => t.type === "OUT").reduce((s, t) => s + t.quantity, 0);
    const totalAdjustments = transactions.filter((t) => t.type === "ADJUSTMENT").length;

    const soldMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
    for (const si of saleItems) {
      const pid = si.productId;
      if (!soldMap[pid]) soldMap[pid] = { name: si.product.name, category: si.product.category.name, qty: 0, revenue: 0 };
      soldMap[pid].qty += si.quantity;
      soldMap[pid].revenue += si.total.toNumber();
    }
    const topSelling = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

    if (format === "csv") {
      const headers = [
        "Product", "Category", "Unit", "Cost Price", "Selling Price",
        "Margin %", "Warehouse Stock", "Shop Stock", "Total Stock",
        "Stock Cost Value", "Stock Selling Value", "Low Stock Threshold", "Status", "Active",
      ];

      const csvRows = productRows.map((r) => [
        r.name, r.category, r.unit, r.costPrice.toFixed(2), r.sellingPrice.toFixed(2),
        r.margin.toFixed(1), String(r.warehouseStock), String(r.shopStock), String(r.totalStock),
        r.stockCostValue.toFixed(2), r.stockSellingValue.toFixed(2), String(r.lowStockThreshold),
        r.status === "OUT_OF_STOCK" ? "Out of Stock" : r.status === "LOW_STOCK" ? "Low Stock" : "OK",
        r.isActive ? "Yes" : "No",
      ]);

      const summaryLines = [
        `INVENTORY REPORT — Generated ${new Date().toLocaleDateString("en-NG")}`,
        `Period: Last ${days} days`, "",
        `Total Products,${totalProducts}`, `Active Products,${activeProducts}`,
        `Low Stock Items,${lowStock.length}`, `Out of Stock Items,${outOfStock.length}`,
        `Total Stock Value (Cost),"${totalCostValue.toFixed(2)}"`,
        `Total Stock Value (Selling),"${totalSellingValue.toFixed(2)}"`, "",
        "PRODUCT DETAILS", headers.join(","),
        ...csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ];

      return new Response(summaryLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="agrohub-inventory-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts, activeProducts,
          lowStockCount: lowStock.length, outOfStockCount: outOfStock.length,
          totalCostValue, totalSellingValue,
          potentialProfit: totalSellingValue - totalCostValue,
          stockIn: totalStockIn, stockOut: totalStockOut, adjustments: totalAdjustments,
        },
        categoryBreakdown, topSelling,
        lowStockProducts: lowStock.map((p) => ({ name: p.name, category: p.category, qty: p.totalStock, threshold: p.lowStockThreshold })),
        outOfStockProducts: outOfStock.map((p) => ({ name: p.name, category: p.category })),
        products: productRows,
        recentTransactions: transactions.slice(0, 50).map((t) => ({
          date: t.createdAt.toISOString(), product: t.product.name,
          type: t.type, quantity: t.quantity, note: t.note, user: t.user.name,
        })),
      },
    });
  } catch (err) {
    console.error("Inventory report error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 });
  }
}
