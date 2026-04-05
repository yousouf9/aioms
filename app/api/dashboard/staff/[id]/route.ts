import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { audit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "staff", "update");
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();
    const { name, role, isActive, resetPassword } = body;

    // Prevent non-super-admin from modifying super admin or manager accounts
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    if (["SUPER_ADMIN", "MANAGER"].includes(target.roleName) && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) {
      if (["SUPER_ADMIN", "MANAGER"].includes(role) && session.role !== "SUPER_ADMIN") {
        return NextResponse.json({ success: false, error: "Only Super Admin can assign this role" }, { status: 403 });
      }
      data.roleName = role;
    }
    if (isActive !== undefined) data.isActive = isActive;

    let tempPassword: string | null = null;
    if (resetPassword) {
      tempPassword = crypto.randomBytes(4).toString("hex").toUpperCase();
      data.passwordHash = await bcrypt.hash(tempPassword, 10);
      data.mustResetPassword = true;
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, roleName: true, isActive: true, lastLoginAt: true, createdAt: true },
    });

    // Send reset email fire-and-forget
    if (resetPassword && tempPassword) {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://turflafia.com"}/login`;
      sendPasswordResetEmail({
        to: target.email,
        staffName: target.name,
        tempPassword,
        loginUrl,
      }).catch((err) => console.error("[STAFF_RESET_EMAIL]", err));
    }

    audit({
      userId: session.id,
      action: "UPDATE_STAFF",
      entity: "User",
      entityId: id,
      metadata: { changes: { name, role, isActive, passwordReset: !!resetPassword } },
    });

    return NextResponse.json({ success: true, data: { ...updated, role: updated.roleName } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update staff" }, { status: 500 });
  }
}
