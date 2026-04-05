import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { invalidatePermissionCache } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const role = await db.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    const body = await req.json();
    const { label, description, color, permissions } = body;

    const data: Record<string, unknown> = {};
    if (label !== undefined) data.label = label.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (color !== undefined) data.color = color;
    if (permissions !== undefined) {
      // Cannot set permissions on SUPER_ADMIN
      if (role.name === "SUPER_ADMIN") {
        return NextResponse.json({ success: false, error: "Cannot modify Super Admin permissions" }, { status: 400 });
      }
      data.permissions = permissions;
    }

    const updated = await db.role.update({ where: { id }, data });

    if (permissions !== undefined) {
      invalidatePermissionCache(role.name);
    }

    audit({
      userId: session.id,
      action: "UPDATE_ROLE",
      entity: "Role",
      entityId: id,
      metadata: { name: role.name, changes: Object.keys(data) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[ROLES_PATCH]", err);
    return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ success: false, error: "Cannot delete system roles" }, { status: 400 });
    }

    if (role._count.users > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete role "${role.label}" — ${role._count.users} user(s) are assigned to it. Reassign them first.`,
      }, { status: 400 });
    }

    await db.role.delete({ where: { id } });
    invalidatePermissionCache(role.name);

    audit({
      userId: session.id,
      action: "DELETE_ROLE",
      entity: "Role",
      entityId: id,
      metadata: { name: role.name, label: role.label },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ROLES_DELETE]", err);
    return NextResponse.json({ success: false, error: "Failed to delete role" }, { status: 500 });
  }
}
