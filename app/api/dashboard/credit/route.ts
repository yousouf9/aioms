import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const credits = await db.creditSale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: credits.map((c) => ({
        ...c,
        totalAmount: c.totalAmount.toNumber(),
        paidAmount: c.paidAmount.toNumber(),
        items: c.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toNumber(), total: i.total.toNumber() })),
        payments: c.payments.map((p) => ({ ...p, amount: p.amount.toNumber() })),
      })),
    });
  } catch (error) {
    console.error("[GET_CREDITS]", error);
    return NextResponse.json({ success: false, error: "Failed to load credit sales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "create");
    if (denied) return denied;

    const body = await req.json();
    const { customerId, creditType, dueDate, season, notes, items } = body;

    if (!customerId) return NextResponse.json({ success: false, error: "Customer is required" }, { status: 400 });
    if (!items || items.length === 0) return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 400 });
    if (!creditType) return NextResponse.json({ success: false, error: "Credit type is required" }, { status: 400 });

    // Calculate totals
    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const creditItems = items.map((item: { productId: string; quantity: number; unitPrice?: number }) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const unitPrice = item.unitPrice ?? product.sellingPrice.toNumber();
      const quantity = Math.max(1, Math.floor(item.quantity));
      const total = unitPrice * quantity;
      totalAmount += total;
      return { productId: item.productId, quantity, unitPrice, total };
    });

    // Ensure customer has DEBTOR role
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    if (!customer.roles.includes("DEBTOR")) {
      await db.customer.update({ where: { id: customerId }, data: { roles: { push: "DEBTOR" } } });
    }

    const creditSale = await db.creditSale.create({
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

    return NextResponse.json({
      success: true,
      data: { ...creditSale, totalAmount: creditSale.totalAmount.toNumber(), paidAmount: creditSale.paidAmount.toNumber() },
    }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_CREDIT]", error);
    return NextResponse.json({ success: false, error: "Failed to create credit sale" }, { status: 500 });
  }
}

// Record a credit payment
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "credit", "update");
    if (denied) return denied;

    const body = await req.json();
    const { creditSaleId, amount, method, reference, notes } = body;

    if (!creditSaleId || !amount || !method) {
      return NextResponse.json({ success: false, error: "Credit sale ID, amount, and payment method are required" }, { status: 400 });
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
