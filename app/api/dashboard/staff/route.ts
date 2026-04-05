import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { sendStaffWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generateTempPassword(): string {
  // 8-char alphanumeric, easy to type
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "staff", "view");
    if (denied) return denied;

    const staff = await db.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        roleName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Map roleName to role for API compatibility
    const staffData = staff.map((s) => ({ ...s, role: s.roleName }));

    return NextResponse.json({ success: true, data: staffData });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "staff", "create");
    if (denied) return denied;

    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ success: false, error: "Name, email, and role are required" }, { status: 400 });
    }

    // Only SUPER_ADMIN can create SUPER_ADMIN or MANAGER
    if (["SUPER_ADMIN", "MANAGER"].includes(role) && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Only Super Admin can create Manager or Super Admin accounts" }, { status: 403 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Validate role exists
    const roleExists = await db.role.findUnique({ where: { name: role } });
    if (!roleExists) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    const user = await db.user.create({
      data: { name, email: normalizedEmail, passwordHash, roleName: role, mustResetPassword: true },
      select: { id: true, name: true, email: true, roleName: true, isActive: true, createdAt: true },
    });

    const userData = { ...user, role: user.roleName };

    // Send welcome email (fire-and-forget)
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
    sendStaffWelcomeEmail({
      to: normalizedEmail,
      staffName: name,
      tempPassword,
      role,
      loginUrl,
    }).catch((err) => console.error("[STAFF] Failed to send welcome email:", err));

    return NextResponse.json({ success: true, data: userData }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create staff" }, { status: 500 });
  }
}
