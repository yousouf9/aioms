import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { deliveredAt: "desc" },
          include: {
            product: { select: { id: true, name: true, unit: true } },
            warehouse: { select: { id: true, name: true } },
            recordedBy: { select: { name: true } },
            payments: { select: { id: true, amount: true, paidAt: true } },
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          include: {
            delivery: { select: { id: true, product: { select: { name: true } } } },
          },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!supplier) return NextResponse.json<ApiResponse>({ success: false, error: "Not found" }, { status: 404 });

    const totalDelivered = supplier.deliveries.reduce((sum, d) => sum + d.totalCost.toNumber(), 0);
    const totalPaid = supplier.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...supplier,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
        totalDelivered,
        totalPaid,
        balance: totalDelivered - totalPaid,
        deliveries: supplier.deliveries.map((d) => ({
          id: d.id,
          product: d.product,
          warehouse: d.warehouse,
          quantity: d.quantity,
          unitCost: d.unitCost.toNumber(),
          totalCost: d.totalCost.toNumber(),
          notes: d.notes,
          deliveredAt: d.deliveredAt.toISOString(),
          recordedBy: d.recordedBy,
          amountPaid: d.payments.reduce((s, p) => s + p.amount.toNumber(), 0),
        })),
        payments: supplier.payments.map((p) => ({
          id: p.id,
          amount: p.amount.toNumber(),
          method: p.method,
          reference: p.reference,
          notes: p.notes,
          paidAt: p.paidAt.toISOString(),
          delivery: p.delivery,
        })),
      },
    });
  } catch (error) {
    console.error("[SUPPLIER_GET]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load supplier" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json() as { name?: string; phone?: string; email?: string; address?: string; notes?: string; isActive?: boolean };

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.phone && { phone: body.phone.trim() }),
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        notes: body.notes?.trim() || null,
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: supplier });
  } catch (error) {
    console.error("[SUPPLIER_PATCH]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update supplier" }, { status: 500 });
  }
}
