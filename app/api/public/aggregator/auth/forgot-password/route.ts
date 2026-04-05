import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendAggregatorPasswordReset } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { email: email.trim().toLowerCase(), passwordHash: { not: null } },
    });

    // Always return success to prevent enumeration
    if (!customer) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a reset code has been sent.",
      });
    }

    // Generate 6-digit OTP
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await sendAggregatorPasswordReset({
      to: customer.email!,
      name: customer.name,
      resetCode: resetToken,
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a reset code has been sent.",
      ...(!process.env.ZEPTOMAIL_TOKEN && {
        _dev_code: resetToken,
        _note: "Email not configured — code shown for development only",
      }),
    });
  } catch (error) {
    console.error("[AGGREGATOR_FORGOT_PASSWORD]", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
