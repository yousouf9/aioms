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

    const shops = await db.shop.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        warehouse: { select: { id: true, name: true, type: true } },
        _count: { select: { stocks: true, sales: true } },
      },
    });

    return NextResponse.json({ success: true, data: shops });
  } catch (error) {
    console.error("[GET_SHOPS]", error);
    return NextResponse.json({ success: false, error: "Failed to load shops" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "warehouses", "create");
    if (denied) return denied;

    const body = await req.json();
    const { name, warehouseId, location } = body;

    if (!name?.trim() || !warehouseId) {
      return NextResponse.json({ success: false, error: "Name and warehouse are required" }, { status: 400 });
    }

    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });

    const shop = await db.shop.create({
      data: { name: name.trim(), warehouseId, location: location?.trim() || null },
    });

    return NextResponse.json({ success: true, data: shop }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_SHOP]", error);
    return NextResponse.json({ success: false, error: "Failed to create shop" }, { status: 500 });
  }
}
