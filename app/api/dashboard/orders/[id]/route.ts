import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "orders", "view");
    if (denied) return denied;

    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, unit: true, imageUrl: true } } } },
        payments: true,
        customer: true,
        processedBy: { select: { name: true } },
      },
    });

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        subtotal: order.subtotal.toNumber(),
        deliveryFee: order.deliveryFee.toNumber(),
        total: order.total.toNumber(),
        items: order.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toNumber(), total: i.total.toNumber() })),
        payments: order.payments.map((p) => ({ ...p, amount: p.amount.toNumber() })),
      },
    });
  } catch (error) {
    console.error("[GET_ORDER]", error);
    return NextResponse.json({ success: false, error: "Failed to load order" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "orders", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();
    const { status, paymentStatus, notes, warehouseId, shopId, note } = body;

    // ── PROCESSING: deduct stock ──────────────────────────────────────────
    if (status === "PROCESSING") {
      if (!warehouseId && !shopId) {
        return NextResponse.json(
          { success: false, error: "Please assign a warehouse or shop to fulfill this order" },
          { status: 400 }
        );
      }

      const order = await db.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

      if (order.status === "PROCESSING" || order.status === "DELIVERED") {
        return NextResponse.json(
          { success: false, error: "Stock has already been deducted for this order" },
          { status: 400 }
        );
      }

      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          if (warehouseId) {
            const stock = await tx.warehouseStock.findUnique({
              where: { productId_warehouseId: { productId: item.productId, warehouseId } },
            });
            if (!stock || stock.quantity < item.quantity) {
              throw new Error(`Insufficient warehouse stock for product ${item.productId}`);
            }
            await tx.warehouseStock.update({
              where: { productId_warehouseId: { productId: item.productId, warehouseId } },
              data: { quantity: { decrement: item.quantity } },
            });
          } else if (shopId) {
            const stock = await tx.shopStock.findUnique({
              where: { productId_shopId: { productId: item.productId, shopId } },
            });
            if (!stock || stock.quantity < item.quantity) {
              throw new Error(`Insufficient shop stock for product ${item.productId}`);
            }
            await tx.shopStock.update({
              where: { productId_shopId: { productId: item.productId, shopId } },
              data: { quantity: { decrement: item.quantity } },
            });
          }

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              warehouseId: warehouseId || null,
              shopId: shopId || null,
              note: `Order ${order.orderCode}`,
              userId: session.id,
            },
          });
        }

        await tx.order.update({
          where: { id },
          data: {
            status: "PROCESSING",
            processedById: session.id,
            fulfilledFromWarehouseId: warehouseId || null,
            fulfilledFromShopId: shopId || null,
            ...(notes !== undefined ? { notes } : note !== undefined ? { notes: note } : {}),
          },
        });
      });

      const updated = await db.order.findUnique({ where: { id } });
      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          subtotal: updated!.subtotal.toNumber(),
          deliveryFee: updated!.deliveryFee.toNumber(),
          total: updated!.total.toNumber(),
        },
      });
    }

    // ── CANCELLED: restore stock if order was PROCESSING ─────────────────
    if (status === "CANCELLED") {
      const order = await db.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

      await db.$transaction(async (tx) => {
        if (order.status === "PROCESSING") {
          for (const item of order.items) {
            if (order.fulfilledFromWarehouseId) {
              await tx.warehouseStock.update({
                where: {
                  productId_warehouseId: {
                    productId: item.productId,
                    warehouseId: order.fulfilledFromWarehouseId,
                  },
                },
                data: { quantity: { increment: item.quantity } },
              });
              await tx.stockTransaction.create({
                data: {
                  productId: item.productId,
                  type: "IN",
                  quantity: item.quantity,
                  warehouseId: order.fulfilledFromWarehouseId,
                  note: `Order ${order.orderCode} cancelled`,
                  userId: session.id,
                },
              });
            } else if (order.fulfilledFromShopId) {
              await tx.shopStock.update({
                where: {
                  productId_shopId: {
                    productId: item.productId,
                    shopId: order.fulfilledFromShopId,
                  },
                },
                data: { quantity: { increment: item.quantity } },
              });
              await tx.stockTransaction.create({
                data: {
                  productId: item.productId,
                  type: "IN",
                  quantity: item.quantity,
                  shopId: order.fulfilledFromShopId,
                  note: `Order ${order.orderCode} cancelled`,
                  userId: session.id,
                },
              });
            }
          }
        }

        await tx.order.update({
          where: { id },
          data: {
            status: "CANCELLED",
            processedById: session.id,
            ...(notes !== undefined ? { notes } : note !== undefined ? { notes: note } : {}),
          },
        });
      });

      const updated = await db.order.findUnique({ where: { id } });
      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          subtotal: updated!.subtotal.toNumber(),
          deliveryFee: updated!.deliveryFee.toNumber(),
          total: updated!.total.toNumber(),
        },
      });
    }

    // ── Other transitions (CONFIRMED, READY, DELIVERED): no stock logic ───
    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;
    if (notes !== undefined) data.notes = notes;
    if (note !== undefined && notes === undefined) data.notes = note;
    if (status && !data.processedById) data.processedById = session.id;

    const order = await db.order.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: { ...order, subtotal: order.subtotal.toNumber(), deliveryFee: order.deliveryFee.toNumber(), total: order.total.toNumber() },
    });
  } catch (error) {
    console.error("[UPDATE_ORDER]", error);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
