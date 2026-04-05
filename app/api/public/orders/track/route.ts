import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 15, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();
    const q = (searchParams.get("q") ?? searchParams.get("phone") ?? "").trim(); // accept both ?q= and legacy ?phone=

    if (!code || !q) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order code and email or phone number are required" },
        { status: 400 }
      );
    }

    const isEmail = q.includes("@");
    const where = isEmail
      ? { orderCode: code, customerEmail: { equals: q, mode: "insensitive" as const } }
      : { orderCode: code, customerPhone: q };

    const order = await db.order.findFirst({
      where,
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No order found. Check your order code and email/phone." },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        orderCode: order.orderCode,
        customerName: order.customerName,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total.toNumber(),
        deliveryMethod: order.deliveryMethod,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
          total: item.total.toNumber(),
        })),
      },
    });
  } catch (error) {
    console.error("[TRACK_ORDER]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to track order" },
      { status: 500 }
    );
  }
}
