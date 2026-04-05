import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

// GET — fetch notifications for current user (latest 30)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: {
          OR: [{ recipientId: session.id }, { recipientId: null }],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.notification.count({
        where: {
          OR: [{ recipientId: session.id }, { recipientId: null }],
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json<ApiResponse>({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH — mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { ids?: string[]; all?: boolean };

    if (body.all) {
      await db.notification.updateMany({
        where: {
          OR: [{ recipientId: session.id }, { recipientId: null }],
          isRead: false,
        },
        data: { isRead: true },
      });
    } else if (body.ids?.length) {
      await db.notification.updateMany({
        where: { id: { in: body.ids }, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_PATCH]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update notifications" }, { status: 500 });
  }
}
