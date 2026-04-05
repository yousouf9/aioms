import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "sales", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const PAGE_SIZE = 30;

    const where: Record<string, unknown> = {};
    if (sessionId) where.sessionId = sessionId;

    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          saleItems: {
            include: { product: { select: { name: true, unit: true } } },
          },
          cashier: { select: { name: true } },
          shop: { select: { name: true } },
        },
      }),
      db.sale.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: sales.map((s) => ({
        ...s,
        total: s.total.toNumber(),
        saleItems: s.saleItems.map((i) => ({
          ...i,
          unitPrice: i.unitPrice.toNumber(),
          total: i.total.toNumber(),
        })),
      })),
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load sales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "sales", "create");
    if (denied) return denied;

    const body = await req.json();
    const { sessionId, shopId, warehouseId, customerId, items, paymentMethod } = body;

    if (!sessionId || !items?.length || !paymentMethod) {
      return NextResponse.json({ success: false, error: "sessionId, items, and paymentMethod are required" }, { status: 400 });
    }

    // Validate session is open
    const saleSession = await db.saleSession.findUnique({ where: { id: sessionId } });
    if (!saleSession || !saleSession.isOpen) {
      return NextResponse.json({ success: false, error: "No open session found. Open a session first." }, { status: 400 });
    }

    // Fetch products
    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ success: false, error: "One or more products not found" }, { status: 400 });
    }

    // Check shop stock if shopId provided
    if (shopId) {
      for (const item of items as { productId: string; quantity: number }[]) {
        const stock = await db.shopStock.findUnique({
          where: { productId_shopId: { productId: item.productId, shopId } },
        });
        const available = stock?.quantity ?? 0;
        if (available < item.quantity) {
          const product = products.find((p) => p.id === item.productId);
          return NextResponse.json({
            success: false,
            error: `Insufficient stock for ${product?.name}. Available: ${available}`,
          }, { status: 400 });
        }
      }
    }

    // Check warehouse stock if warehouseId provided
    if (warehouseId) {
      for (const item of items as { productId: string; quantity: number }[]) {
        const stock = await db.warehouseStock.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        });
        const available = stock?.quantity ?? 0;
        if (available < item.quantity) {
          const product = products.find((p) => p.id === item.productId);
          return NextResponse.json({
            success: false,
            error: `Insufficient stock for ${product?.name}. Available: ${available}`,
          }, { status: 400 });
        }
      }
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const saleItemsData = items.map((item: { productId: string; quantity: number }) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.sellingPrice.toNumber();
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        total: unitPrice * item.quantity,
      };
    });

    const saleTotal = saleItemsData.reduce((sum: number, i: { total: number }) => sum + i.total, 0);

    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          sessionId,
          cashierId: session.id,
          shopId: shopId || null,
          customerId: customerId || null,
          total: saleTotal,
          paymentMethod,
          saleItems: { create: saleItemsData },
          payments: {
            create: {
              reference: `SALE-${Date.now()}`,
              amount: saleTotal,
              method: paymentMethod,
              source: "SALE",
              status: "PAID",
              confirmedAt: new Date(),
            },
          },
        },
        include: {
          saleItems: { include: { product: { select: { name: true, unit: true } } } },
        },
      });


      // Deduct shop stock if shopId provided
      if (shopId) {
        for (const item of saleItemsData) {
          await tx.shopStock.update({
            where: { productId_shopId: { productId: item.productId, shopId } },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              shopId,
              note: `POS Sale #${newSale.id.slice(-6)}`,
              userId: session.id,
            },
          });
        }
      } else if (warehouseId) {
        for (const item of saleItemsData) {
          await tx.warehouseStock.update({
            where: { productId_warehouseId: { productId: item.productId, warehouseId } },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              warehouseId,
              note: `POS Sale #${newSale.id.slice(-6)}`,
              userId: session.id,
            },
          });
        }
      }

      // Update session total
      await tx.saleSession.update({
        where: { id: sessionId },
        data: { totalSales: { increment: saleTotal } },
      });

      return newSale;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...sale,
        total: sale.total.toNumber(),
        saleItems: sale.saleItems.map((i) => ({
          ...i,
          unitPrice: i.unitPrice.toNumber(),
          total: i.total.toNumber(),
        })),
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[CREATE_SALE]", err);
    return NextResponse.json({ success: false, error: "Failed to record sale" }, { status: 500 });
  }
}
