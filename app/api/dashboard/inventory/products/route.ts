import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (q) where.name = { contains: q, mode: "insensitive" };

    const products = await db.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        warehouseStocks: { select: { quantity: true, warehouseId: true } },
        shopStocks: { select: { quantity: true, shopId: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: products.map((p) => {
        const warehouseTotal = p.warehouseStocks.reduce((sum, s) => sum + s.quantity, 0);
        const shopTotal = p.shopStocks.reduce((sum, s) => sum + s.quantity, 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description,
          imageUrl: p.imageUrl,
          unit: p.unit,
          costPrice: p.costPrice.toNumber(),
          sellingPrice: p.sellingPrice.toNumber(),
          lowStockThreshold: p.lowStockThreshold,
          isActive: p.isActive,
          isPublic: p.isPublic,
          category: p.category,
          warehouseStock: warehouseTotal,
          shopStock: shopTotal,
          totalStock: warehouseTotal + shopTotal,
          isLowStock: (warehouseTotal + shopTotal) <= p.lowStockThreshold,
        };
      }),
    });
  } catch (err) {
    console.error("[GET_PRODUCTS]", err);
    return NextResponse.json({ success: false, error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "inventory", "create");
    if (denied) return denied;

    const body = await req.json();
    const { name, categoryId, unit, costPrice, sellingPrice, lowStockThreshold, description, imageUrl, isPublic, sku } = body;

    if (!name?.trim()) return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    if (costPrice === undefined || costPrice === null || costPrice === "") {
      return NextResponse.json({ success: false, error: "Cost price is required" }, { status: 400 });
    }
    if (sellingPrice === undefined || sellingPrice === null || sellingPrice === "") {
      return NextResponse.json({ success: false, error: "Selling price is required" }, { status: 400 });
    }

    const parsedCost = parseFloat(String(costPrice));
    const parsedSell = parseFloat(String(sellingPrice));
    if (isNaN(parsedCost) || parsedCost < 0) return NextResponse.json({ success: false, error: "Invalid cost price" }, { status: 400 });
    if (isNaN(parsedSell) || parsedSell < 0) return NextResponse.json({ success: false, error: "Invalid selling price" }, { status: 400 });

    const category = await db.productCategory.findUnique({ where: { id: categoryId } });
    if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 400 });

    const product = await db.product.create({
      data: {
        name: name.trim(),
        categoryId,
        unit: unit || "PIECE",
        costPrice: parsedCost,
        sellingPrice: parsedSell,
        lowStockThreshold: parseInt(String(lowStockThreshold ?? "5")) || 5,
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        isPublic: isPublic ?? true,
        sku: sku?.trim() || null,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        costPrice: product.costPrice.toNumber(),
        sellingPrice: product.sellingPrice.toNumber(),
        warehouseStock: 0,
        shopStock: 0,
        totalStock: 0,
        isLowStock: true,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[CREATE_PRODUCT]", err);
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}
