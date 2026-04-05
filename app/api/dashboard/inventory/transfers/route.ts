import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import type { Prisma, TransferStatus } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25") || 25));
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const warehouseId = searchParams.get("warehouseId");
    const direction = searchParams.get("direction");

    const where: Prisma.StockTransferWhereInput = {};

    if (status) where.status = status as TransferStatus;

    if (warehouseId) {
      where.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }

    if (direction === "TO_SHOP") {
      where.toShopId = { not: null };
    } else if (direction === "TO_WAREHOUSE") {
      where.toWarehouseId = { not: null };
      where.fromWarehouseId = { not: null };
    } else if (direction === "RETURN") {
      where.fromShopId = { not: null };
    }

    // NOTE: q filter searches via product relation — acceptable for current scale,
    // but consider a denormalised productName column if this becomes a bottleneck at 10k+ rows.
    if (q) {
      where.product = { name: { contains: q, mode: "insensitive" } };
    }

    const [transfers, total] = await Promise.all([
      db.stockTransfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { name: true, unit: true } },
          fromWarehouse: { select: { name: true } },
          fromShop: { select: { name: true } },
          toWarehouse: { select: { name: true } },
          toShop: { select: { name: true } },
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
      }),
      db.stockTransfer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transfers,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[GET_TRANSFERS]", error);
    return NextResponse.json({ success: false, error: "Failed to load transfers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "create");
    if (denied) return denied;

    const body = await req.json();
    const { productId, quantity, fromWarehouseId, fromShopId, toWarehouseId, toShopId, notes, immediate } = body;

    if (!productId || !quantity) {
      return NextResponse.json({ success: false, error: "Product and quantity are required" }, { status: 400 });
    }
    if (!fromWarehouseId && !fromShopId) {
      return NextResponse.json({ success: false, error: "Source warehouse or shop is required" }, { status: 400 });
    }
    if (!toWarehouseId && !toShopId) {
      return NextResponse.json({ success: false, error: "Destination warehouse or shop is required" }, { status: 400 });
    }
    // Shop returns must go to a warehouse
    if (fromShopId && !toWarehouseId) {
      return NextResponse.json({ success: false, error: "Shop returns must specify a destination warehouse" }, { status: 400 });
    }

    const parsedQty = parseInt(String(quantity));
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 });
    }

    // Verify source has enough stock
    if (fromWarehouseId) {
      const sourceStock = await db.warehouseStock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
      });
      if (!sourceStock || sourceStock.quantity < parsedQty) {
        return NextResponse.json({ success: false, error: "Insufficient stock in source warehouse" }, { status: 400 });
      }
    } else if (fromShopId) {
      const sourceStock = await db.shopStock.findUnique({
        where: { productId_shopId: { productId, shopId: fromShopId } },
      });
      if (!sourceStock || sourceStock.quantity < parsedQty) {
        return NextResponse.json({ success: false, error: "Insufficient stock in source shop" }, { status: 400 });
      }
    }

    if (immediate) {
      // Create the transfer record and immediately complete it in one transaction
      const result = await db.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.create({
          data: {
            productId,
            quantity: parsedQty,
            fromWarehouseId: fromWarehouseId || null,
            fromShopId: fromShopId || null,
            toWarehouseId: toWarehouseId || null,
            toShopId: toShopId || null,
            requestedById: session.id,
            approvedById: session.id,
            notes: notes?.trim() || null,
            status: "COMPLETED",
            completedAt: new Date(),
          },
          include: {
            product: { select: { name: true } },
            fromWarehouse: { select: { name: true } },
            fromShop: { select: { name: true } },
            toWarehouse: { select: { name: true } },
            toShop: { select: { name: true } },
          },
        });

        // Deduct from source
        if (fromWarehouseId) {
          await tx.warehouseStock.update({
            where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
            data: { quantity: { decrement: parsedQty } },
          });
        } else if (fromShopId) {
          await tx.shopStock.update({
            where: { productId_shopId: { productId, shopId: fromShopId } },
            data: { quantity: { decrement: parsedQty } },
          });
        }

        // Add to destination
        if (toWarehouseId) {
          await tx.warehouseStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
            update: { quantity: { increment: parsedQty } },
            create: { productId, warehouseId: toWarehouseId, quantity: parsedQty },
          });
        } else if (toShopId) {
          await tx.shopStock.upsert({
            where: { productId_shopId: { productId, shopId: toShopId } },
            update: { quantity: { increment: parsedQty } },
            create: { productId, shopId: toShopId, quantity: parsedQty },
          });
        }

        // Stock transaction OUT from source
        await tx.stockTransaction.create({
          data: {
            productId,
            type: "OUT",
            quantity: parsedQty,
            warehouseId: fromWarehouseId || null,
            shopId: fromShopId || null,
            transferId: transfer.id,
            note: "Transfer out (immediate)",
            userId: session.id,
          },
        });

        // Stock transaction IN to destination
        await tx.stockTransaction.create({
          data: {
            productId,
            type: "IN",
            quantity: parsedQty,
            warehouseId: toWarehouseId || null,
            shopId: toShopId || null,
            transferId: transfer.id,
            note: "Transfer in (immediate)",
            userId: session.id,
          },
        });

        return transfer;
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // Non-immediate: create PENDING transfer (normal approval flow)
    const transfer = await db.stockTransfer.create({
      data: {
        productId,
        quantity: parsedQty,
        fromWarehouseId: fromWarehouseId || null,
        fromShopId: fromShopId || null,
        toWarehouseId: toWarehouseId || null,
        toShopId: toShopId || null,
        requestedById: session.id,
        notes: notes?.trim() || null,
      },
      include: {
        product: { select: { name: true } },
        fromWarehouse: { select: { name: true } },
        fromShop: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        toShop: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: transfer }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_TRANSFER]", error);
    return NextResponse.json({ success: false, error: "Failed to create transfer" }, { status: 500 });
  }
}

// Approve/reject/complete a transfer
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "update");
    if (denied) return denied;

    const body = await req.json();
    const { transferId, action } = body;

    if (!transferId || !action) {
      return NextResponse.json({ success: false, error: "Transfer ID and action are required" }, { status: 400 });
    }

    const transfer = await db.stockTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) return NextResponse.json({ success: false, error: "Transfer not found" }, { status: 404 });

    if (action === "APPROVE") {
      if (transfer.status !== "PENDING") {
        return NextResponse.json({ success: false, error: "Only pending transfers can be approved" }, { status: 400 });
      }
      await db.stockTransfer.update({
        where: { id: transferId },
        data: { status: "APPROVED", approvedById: session.id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "REJECT") {
      if (transfer.status !== "PENDING") {
        return NextResponse.json({ success: false, error: "Only pending transfers can be rejected" }, { status: 400 });
      }
      await db.stockTransfer.update({
        where: { id: transferId },
        data: { status: "REJECTED", approvedById: session.id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "COMPLETE") {
      if (transfer.status !== "APPROVED") {
        return NextResponse.json({ success: false, error: "Only approved transfers can be completed" }, { status: 400 });
      }

      // Verify source still has stock
      const sourceStock = await db.warehouseStock.findUnique({
        where: { productId_warehouseId: { productId: transfer.productId, warehouseId: transfer.fromWarehouseId! } },
      });
      if (!sourceStock || sourceStock.quantity < transfer.quantity) {
        return NextResponse.json({ success: false, error: "Insufficient stock in source warehouse" }, { status: 400 });
      }

      await db.$transaction([
        // Deduct from source
        db.warehouseStock.update({
          where: { productId_warehouseId: { productId: transfer.productId, warehouseId: transfer.fromWarehouseId! } },
          data: { quantity: { decrement: transfer.quantity } },
        }),
        // Add to destination
        transfer.toWarehouseId
          ? db.warehouseStock.upsert({
              where: { productId_warehouseId: { productId: transfer.productId, warehouseId: transfer.toWarehouseId } },
              update: { quantity: { increment: transfer.quantity } },
              create: { productId: transfer.productId, warehouseId: transfer.toWarehouseId, quantity: transfer.quantity },
            })
          : db.shopStock.upsert({
              where: { productId_shopId: { productId: transfer.productId, shopId: transfer.toShopId! } },
              update: { quantity: { increment: transfer.quantity } },
              create: { productId: transfer.productId, shopId: transfer.toShopId!, quantity: transfer.quantity },
            }),
        // Record transactions
        db.stockTransaction.create({
          data: {
            productId: transfer.productId,
            type: "OUT",
            quantity: transfer.quantity,
            warehouseId: transfer.fromWarehouseId,
            transferId: transfer.id,
            note: `Transfer out`,
            userId: session.id,
          },
        }),
        db.stockTransaction.create({
          data: {
            productId: transfer.productId,
            type: "IN",
            quantity: transfer.quantity,
            warehouseId: transfer.toWarehouseId,
            shopId: transfer.toShopId,
            transferId: transfer.id,
            note: `Transfer in`,
            userId: session.id,
          },
        }),
        // Mark complete
        db.stockTransfer.update({
          where: { id: transferId },
          data: { status: "COMPLETED", completedAt: new Date() },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[UPDATE_TRANSFER]", error);
    return NextResponse.json({ success: false, error: "Failed to update transfer" }, { status: 500 });
  }
}
