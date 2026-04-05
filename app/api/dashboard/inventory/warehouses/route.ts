import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "view");
    if (denied) return denied;

    const warehouses = await db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        shops: { where: { isActive: true }, select: { id: true, name: true } },
        _count: { select: { stocks: true } },
      },
    });

    return NextResponse.json({ success: true, data: warehouses });
  } catch (error) {
    console.error("[GET_WAREHOUSES]", error);
    return NextResponse.json({ success: false, error: "Failed to load warehouses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "create");
    if (denied) return denied;

    const body = await req.json();
    const { name, type, location } = body;

    if (!name?.trim() || !type) {
      return NextResponse.json({ success: false, error: "Name and type are required" }, { status: 400 });
    }

    const warehouse = await db.warehouse.create({
      data: { name: name.trim(), type, location: location?.trim() || null },
    });

    return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_WAREHOUSE]", error);
    return NextResponse.json({ success: false, error: "Failed to create warehouse" }, { status: 500 });
  }
}

// Add/update stock for a warehouse
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "update");
    if (denied) return denied;

    const body = await req.json();
    const { warehouseId, productId, quantity, type } = body;

    if (!warehouseId || !productId || quantity === undefined) {
      return NextResponse.json({ success: false, error: "Warehouse, product, and quantity are required" }, { status: 400 });
    }

    const parsedQty = parseInt(String(quantity));
    if (isNaN(parsedQty)) return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 });

    const stock = await db.warehouseStock.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: { quantity: type === "SET" ? parsedQty : { increment: parsedQty } },
      create: { productId, warehouseId, quantity: parsedQty },
    });

    // Record transaction
    await db.stockTransaction.create({
      data: {
        productId,
        type: parsedQty >= 0 ? "IN" : "OUT",
        quantity: Math.abs(parsedQty),
        warehouseId,
        note: type === "SET" ? "Stock adjustment" : "Stock update",
        userId: session.id,
      },
    });

    return NextResponse.json({ success: true, data: stock });
  } catch (error) {
    console.error("[UPDATE_WAREHOUSE_STOCK]", error);
    return NextResponse.json({ success: false, error: "Failed to update stock" }, { status: 500 });
  }
}
