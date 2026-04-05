import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim(); // email or phone

    if (!q || q.length < 5) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    // Auto-detect: email contains @, else treat as phone
    const isEmail = q.includes("@");
    const where = isEmail
      ? { customerEmail: { equals: q, mode: "insensitive" as const } }
      : { customerPhone: q };

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    if (orders.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No orders found for that email or phone number" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: orders.map((o) => ({
        orderCode: o.orderCode,
        customerName: o.customerName,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total.toNumber(),
        deliveryMethod: o.deliveryMethod,
        createdAt: o.createdAt.toISOString(),
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          total: i.total.toNumber(),
        })),
      })),
    });
  } catch (error) {
    console.error("[MY_ORDERS]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
