import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "attendance", "view");
    if (denied) return denied;

    const { searchParams } = request.nextUrl;
    const isStaff = session.role === "STAFF";

    const where: Prisma.AttendanceWhereInput = {};

    if (isStaff) {
      // STAFF can only see their own records, last 14 days
      const since = new Date();
      since.setDate(since.getDate() - 14);
      where.userId = session.id;
      where.clockIn = { gte: since };
    } else {
      // MANAGER / SUPER_ADMIN: all records, last 30 days, filterable
      const since = new Date();
      since.setDate(since.getDate() - 30);
      where.clockIn = { gte: since };

      const userId = searchParams.get("userId");
      const date = searchParams.get("date");

      if (userId) where.userId = userId;

      if (date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.clockIn = { gte: d, lt: nextDay };
      }
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        user: { select: { name: true, roleName: true } },
      },
      orderBy: { clockIn: "desc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("[ATTENDANCE_GET]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load attendance records" },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "attendance", "create");
    if (denied) return denied;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Check for open record today (clocked in, not yet out)
    const openRecord = await db.attendance.findFirst({
      where: {
        userId: session.id,
        clockIn: { gte: todayStart, lte: todayEnd },
        clockOut: null,
      },
      orderBy: { clockIn: "desc" },
    });

    if (openRecord) {
      // Clock out
      const record = await db.attendance.update({
        where: { id: openRecord.id },
        data: { clockOut: now },
        include: { user: { select: { name: true, roleName: true } } },
      });
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { action: "clocked_out", record },
      });
    } else {
      // Check if already clocked in and out today (prevent multiple sessions per day)
      const completedToday = await db.attendance.findFirst({
        where: {
          userId: session.id,
          clockIn: { gte: todayStart, lte: todayEnd },
          clockOut: { not: null },
        },
      });

      if (completedToday) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "You have already clocked in and out today. Only one session per day is allowed." },
          { status: 400 }
        );
      }

      // Clock in
      const record = await db.attendance.create({
        data: {
          userId: session.id,
          clockIn: now,
        },
        include: { user: { select: { name: true, roleName: true } } },
      });
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { action: "clocked_in", record },
      });
    }
  } catch (error) {
    console.error("[ATTENDANCE_POST]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to toggle attendance" },
      { status: 500 }
    );
  }
}
