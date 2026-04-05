import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import type { ApiResponse } from "@/types";
import type { PaymentStatus } from "@/app/generated/prisma/client";
import { audit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "payments", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json() as { status: PaymentStatus; notes?: string };
    const { status, notes } = body;

    if (!status || !["PAID", "UNPAID", "PARTIAL", "REFUNDED"].includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const updatedPayment = await db.payment.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(status === "PAID" ? { confirmedAt: new Date() } : {}),
      },
    });

    // Cascade to associated order
    if (status === "PAID" && payment.orderId) {
      await db.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });
    }

    audit({
      userId: session.id,
      action: "UPDATE_PAYMENT",
      entity: "Payment",
      entityId: id,
      metadata: { previousStatus: payment.status, newStatus: status, reference: payment.reference },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedPayment,
    });
  } catch (error) {
    console.error("[PAYMENT_PATCH]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
