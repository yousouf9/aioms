import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import type { ApiResponse } from "@/types";
import type { PaymentSource, PaymentStatus, Prisma } from "@/app/generated/prisma/client";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "payments", "view");
    if (denied) return denied;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const source = searchParams.get("source");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.PaymentWhereInput = {};

    if (source) where.source = source as PaymentSource;
    if (status) where.status = status as PaymentStatus;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [payments, total, totalAmountResult, todayAmountResult, pendingCount, paidCount] =
      await Promise.all([
        db.payment.findMany({
          where,
          include: {
            order: { select: { orderCode: true, customerName: true, createdAt: true } },
            sale: { select: { id: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        db.payment.count({ where }),
        db.payment.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: {
            status: "PAID",
            confirmedAt: { gte: today, lt: tomorrow },
          },
          _sum: { amount: true },
        }),
        db.payment.count({ where: { status: "UNPAID" } }),
        db.payment.count({ where: { status: "PAID" } }),
      ]);

    return NextResponse.json({
      success: true,
      data: payments.map((p) => ({
        ...p,
        amount: p.amount.toNumber(),
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      summary: {
        total: totalAmountResult._sum.amount?.toNumber() ?? 0,
        todayTotal: todayAmountResult._sum.amount?.toNumber() ?? 0,
        pendingCount,
        paidCount,
      },
    });
  } catch (error) {
    console.error("[PAYMENTS_GET]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load payments" },
      { status: 500 }
    );
  }
}
