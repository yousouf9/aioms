import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAggregatorSession, signAggregatorToken, setAggregatorCookie, AGGREGATOR_COOKIE_NAME } from "@/lib/aggregator-auth";
import { sendAggregatorVerifyEmail } from "@/lib/email";
import { cookies } from "next/headers";

// POST — verify email with OTP code
export async function POST(request: NextRequest) {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code?.trim()) {
      return NextResponse.json({ success: false, error: "Verification code is required" }, { status: 400 });
    }

    const customer = await db.customer.findUnique({ where: { id: session.id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    if (customer.isEmailVerified) {
      return NextResponse.json({ success: true, message: "Email already verified" });
    }

    if (
      !customer.emailVerifyToken ||
      !customer.emailVerifyExpires ||
      customer.emailVerifyToken !== code.trim() ||
      customer.emailVerifyExpires < new Date()
    ) {
      return NextResponse.json({ success: false, error: "Invalid or expired verification code" }, { status: 400 });
    }

    await db.customer.update({
      where: { id: customer.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    // Re-issue token with verified status
    const cookieStore = await cookies();
    const oldToken = cookieStore.get(AGGREGATOR_COOKIE_NAME)?.value;
    if (oldToken) {
      await db.customerSession.deleteMany({ where: { token: oldToken } }).catch(() => {});
    }

    const newToken = await signAggregatorToken({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      profileImageUrl: customer.profileImageUrl,
      isEmailVerified: true,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.customerSession.create({
      data: { customerId: customer.id, token: newToken, expiresAt },
    });

    await setAggregatorCookie(newToken);

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("[VERIFY_EMAIL]", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}

// PUT — resend verification code
export async function PUT() {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const customer = await db.customer.findUnique({ where: { id: session.id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    if (customer.isEmailVerified) {
      return NextResponse.json({ success: true, message: "Email already verified" });
    }

    if (!customer.email) {
      return NextResponse.json({ success: false, error: "No email on file" }, { status: 400 });
    }

    const verifyToken = crypto.randomInt(100000, 999999).toString();
    const verifyExpires = new Date(Date.now() + 30 * 60 * 1000);

    await db.customer.update({
      where: { id: customer.id },
      data: { emailVerifyToken: verifyToken, emailVerifyExpires: verifyExpires },
    });

    await sendAggregatorVerifyEmail({
      to: customer.email,
      name: customer.name,
      code: verifyToken,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent",
      ...(!process.env.ZEPTOMAIL_TOKEN && { _dev_code: verifyToken }),
    });
  } catch (error) {
    console.error("[RESEND_VERIFY]", error);
    return NextResponse.json({ success: false, error: "Failed to resend code" }, { status: 500 });
  }
}
