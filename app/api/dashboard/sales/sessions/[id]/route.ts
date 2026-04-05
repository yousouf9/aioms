import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "sales", "view");
    if (denied) return denied;

    const { id } = await params;
    const saleSession = await db.saleSession.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: {
            saleItems: {
              include: { product: { select: { name: true, unit: true } } },
            },
          },
        },
      },
    });

    if (!saleSession) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...saleSession,
        totalSales: saleSession.totalSales.toNumber(),
        sales: saleSession.sales.map((s) => ({
          ...s,
          total: s.total.toNumber(),
          saleItems: s.saleItems.map((i) => ({
            ...i,
            unitPrice: i.unitPrice.toNumber(),
            total: i.total.toNumber(),
          })),
        })),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load session" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "sales", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();

    if (body.close) {
      // Compute total from sales
      const sales = await db.sale.findMany({ where: { sessionId: id } });
      const total = sales.reduce((sum, s) => sum + s.total.toNumber(), 0);

      const updated = await db.saleSession.update({
        where: { id },
        data: { isOpen: false, closedAt: new Date(), totalSales: total },
      });

      return NextResponse.json({ success: true, data: { ...updated, totalSales: updated.totalSales.toNumber() } });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update session" }, { status: 500 });
  }
}
