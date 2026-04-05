import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { pushNotification } from "@/lib/sse-emitter";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");
    const shopId = searchParams.get("shopId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const PAGE_SIZE = 30;

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (shopId) where.shopId = shopId;

    const [transactions, total] = await Promise.all([
      db.stockTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          product: { select: { name: true, unit: true } },
          user: { select: { name: true } },
        },
      }),
      db.stockTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    console.error("[GET_STOCK]", err);
    return NextResponse.json({ success: false, error: "Failed to load transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "update");
    if (denied) return denied;

    const body = await req.json();
    const { productId, type, quantity, note, warehouseId, shopId } = body;

    if (!productId || !type || quantity === undefined || quantity === null || quantity === "") {
      return NextResponse.json({ success: false, error: "productId, type, and quantity are required" }, { status: 400 });
    }

    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid transaction type" }, { status: 400 });
    }

    const qty = parseInt(String(quantity));
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be a positive number" }, { status: 400 });
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, lowStockThreshold: true },
    });
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 400 });

    // Update stock based on location
    const transaction = await db.$transaction(async (tx) => {
      const txn = await tx.stockTransaction.create({
        data: {
          productId,
          type,
          quantity: qty,
          note: note || null,
          warehouseId: warehouseId || null,
          shopId: shopId || null,
          userId: session.id,
        },
        include: { product: { select: { name: true, unit: true } } },
      });

      // Update the appropriate stock table
      if (warehouseId) {
        if (type === "ADJUSTMENT") {
          await tx.warehouseStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId } },
            create: { productId, warehouseId, quantity: qty },
            update: { quantity: qty },
          });
        } else {
          const delta = type === "IN" ? qty : -qty;
          await tx.warehouseStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId } },
            create: { productId, warehouseId, quantity: Math.max(0, delta) },
            update: { quantity: { increment: delta } },
          });
        }
      } else if (shopId) {
        if (type === "ADJUSTMENT") {
          await tx.shopStock.upsert({
            where: { productId_shopId: { productId, shopId } },
            create: { productId, shopId, quantity: qty },
            update: { quantity: qty },
          });
        } else {
          const delta = type === "IN" ? qty : -qty;
          await tx.shopStock.upsert({
            where: { productId_shopId: { productId, shopId } },
            create: { productId, shopId, quantity: Math.max(0, delta) },
            update: { quantity: { increment: delta } },
          });
        }
      }

      return txn;
    });

    // Check low stock
    if (warehouseId || shopId) {
      const totalStock = await getTotalStock(productId);
      if (totalStock <= product.lowStockThreshold) {
        pushNotification({
          type: "LOW_STOCK",
          title: "Low Stock Alert",
          message: `${product.name} is low on stock (${totalStock} remaining)`,
          metadata: { productId, totalStock, threshold: product.lowStockThreshold },
        });
      }
    }

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (err) {
    console.error("[STOCK_TRANSACTION]", err);
    return NextResponse.json({ success: false, error: "Failed to record transaction" }, { status: 500 });
  }
}

async function getTotalStock(productId: string): Promise<number> {
  const [warehouseStocks, shopStocks] = await Promise.all([
    db.warehouseStock.findMany({ where: { productId }, select: { quantity: true } }),
    db.shopStock.findMany({ where: { productId }, select: { quantity: true } }),
  ]);
  return (
    warehouseStocks.reduce((s, w) => s + w.quantity, 0) +
    shopStocks.reduce((s, sh) => s + sh.quantity, 0)
  );
}
