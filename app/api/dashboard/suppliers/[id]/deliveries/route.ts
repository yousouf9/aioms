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
      productId: string;
      warehouseId: string;
      quantity: number;
      unitCost: number;
      notes?: string;
      deliveredAt?: string;
      addToStock?: boolean;
    };

    if (!body.productId || !body.warehouseId || !body.quantity || !body.unitCost) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Product, warehouse, quantity and unit cost are required" }, { status: 400 });
    }

    const quantity = Math.max(1, Math.floor(body.quantity));
    const unitCost = body.unitCost;
    const totalCost = unitCost * quantity;

    const delivery = await db.$transaction(async (tx) => {
      const d = await tx.supplierDelivery.create({
        data: {
          supplierId,
          productId: body.productId,
          warehouseId: body.warehouseId,
          quantity,
          unitCost,
          totalCost,
          notes: body.notes?.trim() || null,
          deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : new Date(),
          recordedById: session.id,
        },
      });

      if (body.addToStock !== false) {
        const existing = await tx.warehouseStock.findUnique({
          where: { productId_warehouseId: { productId: body.productId, warehouseId: body.warehouseId } },
        });
        if (existing) {
          await tx.warehouseStock.update({
            where: { id: existing.id },
            data: { quantity: { increment: quantity } },
          });
        } else {
          await tx.warehouseStock.create({
            data: { productId: body.productId, warehouseId: body.warehouseId, quantity },
          });
        }
        await tx.stockTransaction.create({
          data: {
            productId: body.productId,
            warehouseId: body.warehouseId,
            type: "IN",
            quantity,
            note: `Supplier delivery — ${d.id}`,
            userId: session.id,
          },
        });
      }

      return d;
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { id: delivery.id } }, { status: 201 });
  } catch (error) {
    console.error("[SUPPLIER_DELIVERY_POST]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to record delivery" }, { status: 500 });
  }
}
