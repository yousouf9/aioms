import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOrderCode } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { initTransaction } from "@/lib/valuepay";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryMethod,
      deliveryAddress,
      notes,
      items,
    } = body;

    if (!customerName?.trim() || !customerPhone?.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "At least one product is required" },
        { status: 400 }
      );
    }

    // Validate products exist and are active/public
    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true, isPublic: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "One or more products are unavailable" },
        { status: 400 }
      );
    }

    // Check total system stock for each item
    for (const item of items as { productId: string; quantity: number }[]) {
      const [warehouseStocks, shopStocks] = await Promise.all([
        db.warehouseStock.findMany({ where: { productId: item.productId }, select: { quantity: true } }),
        db.shopStock.findMany({ where: { productId: item.productId }, select: { quantity: true } }),
      ]);
      const totalAvailable = [
        ...warehouseStocks.map(w => w.quantity),
        ...shopStocks.map(s => s.quantity),
      ].reduce((sum, q) => sum + q, 0);

      if (totalAvailable < item.quantity) {
        const product = products.find(p => p.id === item.productId);
        return NextResponse.json({ success: false, error: `Sorry, ${product?.name} is currently out of stock` }, { status: 400 });
      }
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map((item: { productId: string; quantity: number }) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.sellingPrice.toNumber();
      const quantity = Math.max(1, Math.floor(item.quantity));
      const total = unitPrice * quantity;
      subtotal += total;
      return {
        productId: item.productId,
        quantity,
        unitPrice,
        total,
      };
    });

    // Get delivery fee from settings
    const settings = await db.siteSettings.findUnique({ where: { id: "default" } });
    const deliveryFee = deliveryMethod === "DELIVERY" ? (settings?.deliveryFee.toNumber() ?? 0) : 0;
    const total = subtotal + deliveryFee;

    // Find or create customer
    let customer = await db.customer.findUnique({
      where: { phone: customerPhone.trim() },
    });
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail?.trim() || null,
          roles: ["BUYER"],
        },
      });
    }

    // Generate unique order code
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
        source: "WEBSITE",
        subtotal,
        deliveryFee,
        total,
        items: {
          create: orderItems,
        },
      },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    // Initiate Valuepay payment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mbmstrikers.com.ng";
    const transactionRef = `AGR-PAY-${order.orderCode}-${Date.now()}`;

    // Split customer name into first/last (fallback gracefully)
    const nameParts = customerName.trim().split(" ");
    const firstName = nameParts[0] ?? customerName.trim();
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Email is optional on order but required by Valuepay — use phone-based placeholder as fallback
    const email = (customerEmail?.trim()) || `${customerPhone.replace(/\D/g, "")}@mbmstrikers.com.ng`;

    const vpResult = await initTransaction({
      transactionRef,
      redirectUrl: `${appUrl}/payment/return`,
      amount: total,
      customerEmail: email,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerFullName: customerName.trim(),
    });

    if (vpResult) {
      // Create Payment record
      await db.payment.create({
        data: {
          reference: transactionRef,
          amount: total,
          method: "ONLINE",
          source: "ORDER",
          status: "UNPAID",
          valuepayRef: vpResult.transactionRef, // use Valuepay's ref (may differ from ours)
          orderId: order.id,
        },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          orderCode: order.orderCode,
          total: order.total.toNumber(),
          status: order.status,
          itemCount: order.items.length,
          paymentUrl: vpResult.paymentUrl,
        },
      }, { status: 201 });
    }

    // Valuepay init failed — still return order (staff can chase payment manually)
    console.error("[PUBLIC_ORDER] Valuepay initTransaction returned null for order", order.id);
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        orderCode: order.orderCode,
        total: order.total.toNumber(),
        status: order.status,
        itemCount: order.items.length,
        paymentUrl: null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[PUBLIC_ORDER_CREATE]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to place order" },
      { status: 500 }
    );
  }
}
