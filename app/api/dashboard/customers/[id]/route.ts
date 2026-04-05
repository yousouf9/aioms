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
    const denied = await requirePermission(session, "customers", "view");
    if (denied) return denied;

    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 10 },
        creditSales: { orderBy: { createdAt: "desc" }, take: 10, include: { payments: true } },
        aggregatorOffers: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { orders: true, creditSales: true, aggregatorOffers: true } },
      },
    });

    if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("[GET_CUSTOMER]", error);
    return NextResponse.json({ success: false, error: "Failed to load customer" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "customers", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, address, roles, notes } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (phone !== undefined) data.phone = phone.trim();
    if (email !== undefined) data.email = email?.trim() || null;
    if (address !== undefined) data.address = address?.trim() || null;
    if (roles !== undefined) data.roles = roles;
    if (notes !== undefined) data.notes = notes?.trim() || null;

    const customer = await db.customer.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("[UPDATE_CUSTOMER]", error);
    return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 500 });
  }
}
