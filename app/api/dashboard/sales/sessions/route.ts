import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "sales", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const PAGE_SIZE = 20;

    const [sessions, total] = await Promise.all([
      db.saleSession.findMany({
        orderBy: { openedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          _count: { select: { sales: true } },
        },
      }),
      db.saleSession.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: sessions.map((s) => ({
        ...s,
        totalSales: s.totalSales.toNumber(),
        salesCount: s._count.sales,
      })),
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "sales", "create");
    if (denied) return denied;

    // Close any existing open session for this cashier
    await db.saleSession.updateMany({
      where: { cashierId: session.id, isOpen: true },
      data: { isOpen: false, closedAt: new Date() },
    });

    const newSession = await db.saleSession.create({
      data: { cashierId: session.id },
    });

    return NextResponse.json({ success: true, data: { ...newSession, totalSales: 0 } }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to open session" }, { status: 500 });
  }
}
