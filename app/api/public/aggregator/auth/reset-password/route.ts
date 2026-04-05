import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email?.trim() || !code?.trim() || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { email: email.trim().toLowerCase(), passwordHash: { not: null } },
    });

    if (
      !customer ||
      !customer.passwordResetToken ||
      !customer.passwordResetExpires ||
      customer.passwordResetToken !== code.trim() ||
      customer.passwordResetExpires < new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all existing sessions
    await db.customerSession.deleteMany({ where: { customerId: customer.id } });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error("[AGGREGATOR_RESET_PASSWORD]", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
