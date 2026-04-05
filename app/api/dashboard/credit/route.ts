import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

// ─── GET: list credit sales with pagination, search, overdue auto-detection ──

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const q = searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const where: Prisma.CreditSaleWhereInput = {};
    if (status) where.status = status as Prisma.EnumCreditStatusFilter;
    if (customerId) where.customerId = customerId;
    if (q) where.customer = { name: { contains: q, mode: "insensitive" } };

    const [credits, total] = await Promise.all([
      db.creditSale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } },
          payments: { orderBy: { createdAt: "desc" } },
          _count: { select: { payments: true } },
        },
      }),
      db.creditSale.count({ where }),
    ]);

    // Auto-detect overdue: batch-update ACTIVE credits whose dueDate is in the past
    const now = new Date();
    const overdueIds = credits
      .filter((c) => c.status === "ACTIVE" && c.dueDate && c.dueDate < now)
      .map((c) => c.id);

    if (overdueIds.length > 0) {
      await db.creditSale.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "OVERDUE" },
      });
    }

    const overdueSet = new Set(overdueIds);

    return NextResponse.json({
      success: true,
      data: credits.map((c) => ({
        ...c,
        status: overdueSet.has(c.id) ? "OVERDUE" : c.status,
        totalAmount: c.totalAmount.toNumber(),
        paidAmount: c.paidAmount.toNumber(),
        items: c.items.map((i) => ({
          ...i,
          unitPrice: i.unitPrice.toNumber(),
          total: i.total.toNumber(),
        })),
        payments: c.payments.map((p) => ({ ...p, amount: p.amount.toNumber() })),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    console.error("[GET_CREDITS]", error);
    return NextResponse.json({ success: false, error: "Failed to load credit sales" }, { status: 500 });
  }
}

// ─── POST: create credit sale, validate stock, deduct from warehouse or shop ──

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "create");
    if (denied) return denied;

    const body = await req.json();
    const { customerId, creditType, dueDate, season, notes, items, warehouseId, shopId } = body;

    if (!customerId) return NextResponse.json({ success: false, error: "Customer is required" }, { status: 400 });
    if (!items || items.length === 0) return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 400 });
    if (!creditType) return NextResponse.json({ success: false, error: "Credit type is required" }, { status: 400 });
    if (!warehouseId && !shopId) {
      return NextResponse.json({ success: false, error: "A warehouse or shop must be specified as the stock source" }, { status: 400 });
    }

    // Fetch active products
    const productIds: string[] = items.map((i: { productId: string }) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    if (products.length !== productIds.length) {
      return NextResponse.json({ success: false, error: "One or more products not found or inactive" }, { status: 400 });
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Build credit items and total
    let totalAmount = 0;
    const creditItems: { productId: string; quantity: number; unitPrice: number; total: number }[] = items.map(
      (item: { productId: string; quantity: number; unitPrice?: number }) => {
        const product = productMap.get(item.productId)!;
        const unitPrice = item.unitPrice ?? product.sellingPrice.toNumber();
        const quantity = Math.max(1, Math.floor(item.quantity));
        const total = unitPrice * quantity;
        totalAmount += total;
        return { productId: item.productId, quantity, unitPrice, total };
      }
    );

    // Stock sufficiency check (outside transaction to return a clear error)
    if (shopId) {
      for (const item of creditItems) {
        const stock = await db.shopStock.findUnique({
          where: { productId_shopId: { productId: item.productId, shopId } },
        });
        const available = stock?.quantity ?? 0;
        if (available < item.quantity) {
          const name = productMap.get(item.productId)?.name ?? item.productId;
          return NextResponse.json(
            { success: false, error: `Insufficient shop stock for "${name}". Available: ${available}` },
            { status: 400 }
          );
        }
      }
    } else if (warehouseId) {
      for (const item of creditItems) {
        const stock = await db.warehouseStock.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        });
        const available = stock?.quantity ?? 0;
        if (available < item.quantity) {
          const name = productMap.get(item.productId)?.name ?? item.productId;
          return NextResponse.json(
            { success: false, error: `Insufficient warehouse stock for "${name}". Available: ${available}` },
            { status: 400 }
          );
        }
      }
    }

    // Ensure customer exists and has DEBTOR role
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    if (!customer.roles.includes("DEBTOR")) {
      await db.customer.update({ where: { id: customerId }, data: { roles: { push: "DEBTOR" } } });
    }

    const creditSale = await db.$transaction(async (tx) => {
      const sale = await tx.creditSale.create({
        data: {
          customerId,
          creditType,
          totalAmount,
          dueDate: dueDate ? new Date(dueDate) : null,
          season: season || null,
          notes: notes?.trim() || null,
          createdById: session.id,
          items: { create: creditItems },
        },
        include: {
          customer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      });

      const note = `Credit sale #${sale.id.slice(-6)}`;

      if (shopId) {
        for (const item of creditItems) {
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
              note,
              userId: session.id,
            },
          });
        }
      } else if (warehouseId) {
        for (const item of creditItems) {
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
              note,
              userId: session.id,
            },
          });
        }
      }

      return sale;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...creditSale,
          totalAmount: creditSale.totalAmount.toNumber(),
          paidAmount: creditSale.paidAmount.toNumber(),
          items: creditSale.items.map((i) => ({
            ...i,
            unitPrice: i.unitPrice.toNumber(),
            total: i.total.toNumber(),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CREATE_CREDIT]", error);
    return NextResponse.json({ success: false, error: "Failed to create credit sale" }, { status: 500 });
  }
}

// ─── PUT: record a credit payment ─────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "update");
    if (denied) return denied;

    const body = await req.json();
    const { creditSaleId, amount, method, reference, notes } = body;

    if (!creditSaleId || !amount || !method) {
      return NextResponse.json(
        { success: false, error: "Credit sale ID, amount, and payment method are required" },
        { status: 400 }
      );
    }

    const creditSale = await db.creditSale.findUnique({ where: { id: creditSaleId } });
    if (!creditSale) return NextResponse.json({ success: false, error: "Credit sale not found" }, { status: 404 });

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid payment amount" }, { status: 400 });
    }

    const newPaidAmount = creditSale.paidAmount.toNumber() + parsedAmount;
    const totalAmount = creditSale.totalAmount.toNumber();
    const newStatus = newPaidAmount >= totalAmount ? "PAID" : "PARTIALLY_PAID";

    const [payment] = await db.$transaction([
      db.creditPayment.create({
        data: {
          creditSaleId,
          customerId: creditSale.customerId,
          amount: parsedAmount,
          method,
          reference: reference || null,
          notes: notes?.trim() || null,
          recordedById: session.id,
        },
      }),
      db.creditSale.update({
        where: { id: creditSaleId },
        data: { paidAmount: newPaidAmount, status: newStatus },
      }),
    ]);

    return NextResponse.json({ success: true, data: { ...payment, amount: parsedAmount } });
  } catch (error) {
    console.error("[CREDIT_PAYMENT]", error);
    return NextResponse.json({ success: false, error: "Failed to record payment" }, { status: 500 });
  }
}

// ─── PATCH: return to inventory or manual overdue mark ────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "update");
    if (denied) return denied;

    const body = await req.json();
    const { creditSaleId, action, warehouseId, shopId } = body;

    if (!creditSaleId || !action) {
      return NextResponse.json({ success: false, error: "creditSaleId and action are required" }, { status: 400 });
    }

    const creditSale = await db.creditSale.findUnique({
      where: { id: creditSaleId },
      include: { items: true },
    });
    if (!creditSale) return NextResponse.json({ success: false, error: "Credit sale not found" }, { status: 404 });

    // ── MARK_OVERDUE ──────────────────────────────────────────────────────────
    if (action === "MARK_OVERDUE") {
      const updated = await db.creditSale.update({
        where: { id: creditSaleId },
        data: { status: "OVERDUE" },
      });
      return NextResponse.json({
        success: true,
        data: { ...updated, totalAmount: updated.totalAmount.toNumber(), paidAmount: updated.paidAmount.toNumber() },
      });
    }

    // ── RETURN ────────────────────────────────────────────────────────────────
    if (action === "RETURN") {
      if (creditSale.status === "RETURNED" || creditSale.status === "PAID") {
        return NextResponse.json(
          { success: false, error: `Cannot return a credit sale with status "${creditSale.status}"` },
          { status: 400 }
        );
      }
      if (creditSale.returnedToInventory) {
        return NextResponse.json(
          { success: false, error: "Stock for this credit sale has already been returned to inventory" },
          { status: 400 }
        );
      }
      if (!warehouseId && !shopId) {
        return NextResponse.json(
          { success: false, error: "A warehouse or shop must be specified as the return destination" },
          { status: 400 }
        );
      }

      const updated = await db.$transaction(async (tx) => {
        const sale = await tx.creditSale.update({
          where: { id: creditSaleId },
          data: { status: "RETURNED", returnedToInventory: true },
        });

        const note = `Return from credit sale #${creditSaleId.slice(-6)}`;

        if (shopId) {
          for (const item of creditSale.items) {
            await tx.shopStock.upsert({
              where: { productId_shopId: { productId: item.productId, shopId } },
              update: { quantity: { increment: item.quantity } },
              create: { productId: item.productId, shopId, quantity: item.quantity },
            });
            await tx.stockTransaction.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                shopId,
                note,
                userId: session.id,
              },
            });
          }
        } else if (warehouseId) {
          for (const item of creditSale.items) {
            await tx.warehouseStock.upsert({
              where: { productId_warehouseId: { productId: item.productId, warehouseId } },
              update: { quantity: { increment: item.quantity } },
              create: { productId: item.productId, warehouseId, quantity: item.quantity },
            });
            await tx.stockTransaction.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                warehouseId,
                note,
                userId: session.id,
              },
            });
          }
        }

        return sale;
      });

      return NextResponse.json({
        success: true,
        data: { ...updated, totalAmount: updated.totalAmount.toNumber(), paidAmount: updated.paidAmount.toNumber() },
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action "${action}"` }, { status: 400 });
  } catch (error) {
    console.error("[CREDIT_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to process credit action" }, { status: 500 });
  }
}
