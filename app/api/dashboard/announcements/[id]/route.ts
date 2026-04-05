import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { revalidateAnnouncements } from "@/lib/cache";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "announcements", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();
    const { title, body: text, isActive, pinned, mediaUrl, mediaType } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (text !== undefined) data.body = text;
    if (isActive !== undefined) data.isActive = isActive;
    if (pinned !== undefined) data.pinned = pinned;
    if (mediaUrl !== undefined) data.mediaUrl = mediaUrl?.trim() || null;
    if (mediaType !== undefined) data.mediaType = mediaType || null;

    const announcement = await db.announcement.update({ where: { id }, data });
    revalidateAnnouncements();
    return NextResponse.json({ success: true, data: announcement });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "announcements", "delete");
    if (denied) return denied;

    const { id } = await params;
    const announcement = await db.announcement.findUnique({ where: { id } });
    if (announcement?.mediaUrl) {
      deleteFromCloudinary(announcement.mediaUrl).catch(() => {});
    }
    await db.announcement.delete({ where: { id } });
    revalidateAnnouncements();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete announcement" }, { status: 500 });
  }
}
