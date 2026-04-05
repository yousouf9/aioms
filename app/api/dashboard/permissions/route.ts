import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { RESOURCES, invalidatePermissionCache } from "@/lib/permissions";
import type { PermissionMatrix, PermissionAction } from "@/types";

const ACTIONS: PermissionAction[] = ["view", "create", "update", "delete"];

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const rows = await db.role.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Map to the shape the permissions editor expects
    const data = rows.map((r) => ({
      id: r.id,
      role: r.name,
      label: r.label,
      description: r.description,
      permissions: r.permissions as PermissionMatrix | null,
      isSystem: r.isSystem,
      color: r.color,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load permissions" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    // Only SUPER_ADMIN can modify permissions — hardcoded, not permission-gated
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { role, permissions } = body as { role: string; permissions: PermissionMatrix };

    if (!role || !permissions) {
      return NextResponse.json({ success: false, error: "Missing role or permissions" }, { status: 400 });
    }

    // Cannot modify SUPER_ADMIN permissions
    if (role === "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Cannot modify Super Admin permissions" }, { status: 400 });
    }

    // Validate the shape
    for (const resource of RESOURCES) {
      if (!permissions[resource]) {
        return NextResponse.json({ success: false, error: `Missing resource: ${resource}` }, { status: 400 });
      }
      for (const action of ACTIONS) {
        if (typeof permissions[resource][action] !== "boolean") {
          return NextResponse.json({ success: false, error: `Invalid permission: ${resource}.${action}` }, { status: 400 });
        }
      }
    }

    // Update the Role model directly
    const updated = await db.role.update({
      where: { name: role },
      data: { permissions: permissions as object },
    });

    // Clear cache so changes take effect immediately
    invalidatePermissionCache(role);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Failed to save permissions:", err);
    return NextResponse.json({ success: false, error: "Failed to save permissions" }, { status: 500 });
  }
}
