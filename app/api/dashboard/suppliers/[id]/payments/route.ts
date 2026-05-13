import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id: supplierId } = await params;
    const body = await req.json() as {
      amount: number;
      method?: string;
      reference?: string;
      receiptUrl?: string;
      notes?: string;
      deliveryId?: string;
      paidAt?: string;
    };

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Valid amount is required" }, { status: 400 });
    }

    const payment = await db.supplierPayment.create({
      data: {
        supplierId,
        amount: body.amount,
        method: (body.method as "CASH" | "TRANSFER" | "POS" | "ONLINE") || "CASH",
        reference: body.reference?.trim() || null,
        receiptUrl: body.receiptUrl?.trim() || null,
        notes: body.notes?.trim() || null,
        deliveryId: body.deliveryId || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        recordedById: session.id,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { id: payment.id } }, { status: 201 });
  } catch (error) {
    console.error("[SUPPLIER_PAYMENT_POST]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to record payment" }, { status: 500 });
  }
}
