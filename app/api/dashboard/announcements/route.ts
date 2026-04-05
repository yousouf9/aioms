import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { revalidateAnnouncements } from "@/lib/cache";
import type { PaginatedResponse, ApiResponse } from "@/types";
import type { Prisma } from "@/app/generated/prisma/client";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "announcements", "view");
    if (denied) return denied;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const q = searchParams.get("q");
    const status = searchParams.get("status"); // "active" | "hidden" | "pinned" | null

    const where: Prisma.AnnouncementWhereInput = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status === "active") where.isActive = true;
    else if (status === "hidden") where.isActive = false;
    else if (status === "pinned") where.pinned = true;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.announcement.count({ where }),
    ]);

    return NextResponse.json<PaginatedResponse<(typeof announcements)[0]>>({
      success: true,
      data: announcements,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load announcements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "announcements", "create");
    if (denied) return denied;

    const body = await req.json();
    const { title, body: text, isActive, pinned, mediaUrl, mediaType } = body;

    if (!title || !text) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Title and body are required" },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        body: text,
        isActive: isActive ?? true,
        pinned: pinned ?? false,
        mediaUrl: mediaUrl?.trim() || null,
        mediaType: mediaType || null,
      },
    });

    revalidateAnnouncements();
    return NextResponse.json<ApiResponse>({ success: true, data: announcement }, { status: 201 });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
