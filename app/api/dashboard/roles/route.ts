import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { RESOURCES } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { PermissionMatrix, PermissionAction } from "@/types";

const ACTIONS: PermissionAction[] = ["view", "create", "update", "delete"];

function allFalseMatrix(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const r of RESOURCES) {
    matrix[r] = { view: false, create: false, update: false, delete: false };
  }
  return matrix;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const roles = await db.role.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        label: true,
        description: true,
        isSystem: true,
        color: true,
        sortOrder: true,
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({ success: true, data: roles });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load roles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, label, description, color } = body as {
      name?: string;
      label?: string;
      description?: string;
      color?: string;
    };

    if (!name || !label) {
      return NextResponse.json({ success: false, error: "Name and label are required" }, { status: 400 });
    }

    // Validate name format: uppercase letters, numbers, underscore only
    const nameUpper = name.toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z][A-Z0-9_]*$/.test(nameUpper)) {
      return NextResponse.json({ success: false, error: "Role name must contain only letters, numbers, and underscores" }, { status: 400 });
    }

    // Check uniqueness
    const existing = await db.role.findUnique({ where: { name: nameUpper } });
    if (existing) {
      return NextResponse.json({ success: false, error: "A role with this name already exists" }, { status: 409 });
    }

    // Get next sort order
    const maxSort = await db.role.aggregate({ _max: { sortOrder: true } });
    const nextSort = (maxSort._max.sortOrder ?? 0) + 1;

    const role = await db.role.create({
      data: {
        name: nameUpper,
        label: label.trim(),
        description: description?.trim() || null,
        permissions: allFalseMatrix() as object,
        isSystem: false,
        color: color || "bg-gray-100 text-gray-600",
        sortOrder: nextSort,
      },
    });

    audit({
      userId: session.id,
      action: "CREATE_ROLE",
      entity: "Role",
      entityId: role.id,
      metadata: { name: role.name, label: role.label },
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (err) {
    console.error("[ROLES_POST]", err);
    return NextResponse.json({ success: false, error: "Failed to create role" }, { status: 500 });
  }
}
