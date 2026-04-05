import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signAggregatorToken, setAggregatorCookie } from "@/lib/aggregator-auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { email: email.trim().toLowerCase(), passwordHash: { not: null } },
    });

    if (!customer || !customer.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signAggregatorToken({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      profileImageUrl: customer.profileImageUrl,
      isEmailVerified: customer.isEmailVerified,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.customerSession.create({
      data: { customerId: customer.id, token, expiresAt },
    });

    await setAggregatorCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        isEmailVerified: customer.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("[AGGREGATOR_LOGIN]", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
