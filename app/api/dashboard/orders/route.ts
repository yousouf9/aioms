import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { generateOrderCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "orders", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const source = searchParams.get("source");
    const q = searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (source) where.source = source;
    if (q) {
      where.OR = [
        { orderCode: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { select: { id: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        paymentStatus: o.paymentStatus,
        source: o.source,
        total: o.total.toNumber(),
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    console.error("[GET_ORDERS]", error);
    return NextResponse.json({ success: false, error: "Failed to load orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "orders", "create");
    if (denied) return denied;

    const body = await req.json();
    const { customerName, customerPhone, customerEmail, deliveryMethod, deliveryAddress, notes, source, items } = body;

    if (!customerName?.trim() || !customerPhone?.trim()) {
      return NextResponse.json({ success: false, error: "Customer name and phone are required" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 400 });
    }

    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItems = items.map((item: { productId: string; quantity: number }) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const unitPrice = product.sellingPrice.toNumber();
      const quantity = Math.max(1, Math.floor(item.quantity));
      const total = unitPrice * quantity;
      subtotal += total;
      return { productId: item.productId, quantity, unitPrice, total };
    });

    const settings = await db.siteSettings.findUnique({ where: { id: "default" } });
    const deliveryFee = deliveryMethod === "DELIVERY" ? (settings?.deliveryFee.toNumber() ?? 0) : 0;
    const total = subtotal + deliveryFee;

    // Find or create customer
    let customer = await db.customer.findUnique({ where: { phone: customerPhone.trim() } });
    if (!customer) {
      customer = await db.customer.create({
        data: { name: customerName.trim(), phone: customerPhone.trim(), email: customerEmail?.trim() || null, roles: ["BUYER"] },
      });
    }

    let orderCode = generateOrderCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.order.findUnique({ where: { orderCode } });
      if (!existing) break;
      orderCode = generateOrderCode();
      attempts++;
    }

    const order = await db.order.create({
      data: {
        orderCode,
        customerId: customer.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || null,
        deliveryMethod: deliveryMethod === "DELIVERY" ? "DELIVERY" : "PICKUP",
        deliveryAddress: deliveryAddress?.trim() || null,
        notes: notes?.trim() || null,
        source: source || "WALK_IN",
        processedById: session.id,
        subtotal,
        deliveryFee,
        total,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: { ...order, subtotal: order.subtotal.toNumber(), deliveryFee: order.deliveryFee.toNumber(), total: order.total.toNumber() } }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_ORDER]", error);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}
