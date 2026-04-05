import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "customers", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const role = searchParams.get("role");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const rawPageSize = parseInt(searchParams.get("pageSize") ?? "20", 10) || 20;
    const pageSize = Math.min(100, Math.max(1, rawPageSize));

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (role) where.roles = { has: role };

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { orders: true, creditSales: true, aggregatorOffers: true } },
        },
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[GET_CUSTOMERS]", error);
    return NextResponse.json({ success: false, error: "Failed to load customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "customers", "create");
    if (denied) return denied;

    const body = await req.json();
    const { name, phone, email, address, roles, notes } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ success: false, error: "Name and phone are required" }, { status: 400 });
    }

    const existing = await db.customer.findUnique({ where: { phone: phone.trim() } });
    if (existing) {
      return NextResponse.json({ success: false, error: "A customer with this phone number already exists" }, { status: 409 });
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        roles: roles || ["BUYER"],
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_CUSTOMER]", error);
    return NextResponse.json({ success: false, error: "Failed to create customer" }, { status: 500 });
  }
}
