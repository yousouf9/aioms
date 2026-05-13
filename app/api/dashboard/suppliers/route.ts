import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "suppliers", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const suppliers = await db.supplier.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { deliveries: true, payments: true } },
      },
    });

    const data = await Promise.all(
      suppliers.map(async (s) => {
        const [totalDelivered, totalPaid] = await Promise.all([
          db.supplierDelivery.aggregate({
            where: { supplierId: s.id },
            _sum: { totalCost: true },
          }),
          db.supplierPayment.aggregate({
            where: { supplierId: s.id },
            _sum: { amount: true },
          }),
        ]);
        return {
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          address: s.address,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
          deliveryCount: s._count.deliveries,
          totalDelivered: totalDelivered._sum.totalCost?.toNumber() ?? 0,
          totalPaid: totalPaid._sum.amount?.toNumber() ?? 0,
        };
      })
    );

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    console.error("[SUPPLIERS_GET]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "suppliers", "create");
    if (denied) return denied;

    const body = await req.json() as { name: string; phone: string; email?: string; address?: string; notes?: string };

    if (!body.name?.trim() || !body.phone?.trim()) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Name and phone are required" }, { status: 400 });
    }

    const supplier = await db.supplier.create({
      data: {
        name: body.name.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        notes: body.notes?.trim() || null,
        createdById: session.id,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: supplier }, { status: 201 });
  } catch (error) {
    console.error("[SUPPLIERS_POST]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create supplier" }, { status: 500 });
  }
}
