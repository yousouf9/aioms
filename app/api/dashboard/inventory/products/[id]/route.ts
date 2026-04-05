import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "view");
    if (denied) return denied;

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        warehouseStocks: { include: { warehouse: { select: { name: true, type: true } } } },
        shopStocks: { include: { shop: { select: { name: true } } } },
        priceHistory: { orderBy: { createdAt: "desc" }, take: 10, include: { changedBy: { select: { name: true } } } },
      },
    });

    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        costPrice: product.costPrice.toNumber(),
        sellingPrice: product.sellingPrice.toNumber(),
        warehouseStocks: product.warehouseStocks.map((s) => ({ ...s })),
        priceHistory: product.priceHistory.map((h) => ({
          ...h,
          oldPrice: h.oldPrice.toNumber(),
          newPrice: h.newPrice.toNumber(),
        })),
      },
    });
  } catch (err) {
    console.error("[GET_PRODUCT]", err);
    return NextResponse.json({ success: false, error: "Failed to load product" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();
    const { name, unit, costPrice, sellingPrice, lowStockThreshold, isActive, isPublic, description, imageUrl, categoryId, sku } = body;

    // Fetch current state once for price-history + image-replacement checks
    const existing = await db.product.findUnique({
      where: { id },
      select: { sellingPrice: true, imageUrl: true },
    });

    // Record price history if selling price changed
    if (sellingPrice !== undefined && existing) {
      if (existing.sellingPrice.toNumber() !== parseFloat(String(sellingPrice))) {
        await db.priceHistory.create({
          data: {
            productId: id,
            oldPrice: existing.sellingPrice,
            newPrice: parseFloat(String(sellingPrice)),
            changedById: session.id,
            reason: body.priceChangeReason || null,
          },
        });
      }
    }

    // If the image is being replaced or cleared, remove the old asset from Cloudinary
    if (imageUrl !== undefined && existing?.imageUrl && existing.imageUrl !== imageUrl) {
      deleteFromCloudinary(existing.imageUrl).catch((err) =>
        console.error("[UPDATE_PRODUCT] Cloudinary cleanup failed", err)
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (unit !== undefined) data.unit = unit;
    if (costPrice !== undefined) data.costPrice = parseFloat(String(costPrice));
    if (sellingPrice !== undefined) data.sellingPrice = parseFloat(String(sellingPrice));
    if (lowStockThreshold !== undefined) data.lowStockThreshold = parseInt(String(lowStockThreshold));
    if (isActive !== undefined) data.isActive = isActive;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (description !== undefined) data.description = description?.trim() || null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (sku !== undefined) data.sku = sku?.trim() || null;

    const product = await db.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        costPrice: product.costPrice.toNumber(),
        sellingPrice: product.sellingPrice.toNumber(),
      },
    });
  } catch (err) {
    console.error("[UPDATE_PRODUCT]", err);
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "inventory", "delete");
    if (denied) return denied;

    const { id } = await params;
    const existing = await db.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    if (existing?.imageUrl) {
      deleteFromCloudinary(existing.imageUrl).catch((err) =>
        console.error("[DELETE_PRODUCT] Cloudinary cleanup failed", err)
      );
    }
    await db.product.update({
      where: { id },
      data: { isActive: false, imageUrl: null },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE_PRODUCT]", err);
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
