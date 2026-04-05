import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signAggregatorToken, setAggregatorCookie } from "@/lib/aggregator-auth";
import { sendAggregatorVerifyEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email, password, address, profileImageUrl } = await request.json();

    if (!name?.trim() || !phone?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Name, phone, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if phone already registered with a password
    const existing = await db.customer.findUnique({ where: { phone: phone.trim() } });
    if (existing?.passwordHash) {
      return NextResponse.json(
        { success: false, error: "An account with this phone number already exists. Please login." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit email verification OTP
    const verifyToken = crypto.randomInt(100000, 999999).toString();
    const verifyExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    let customer;
    if (existing) {
      const roles = existing.roles.includes("AGGREGATOR")
        ? existing.roles
        : [...existing.roles, "AGGREGATOR" as const];
      customer = await db.customer.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          email: email.trim(),
          address: address?.trim() || existing.address,
          profileImageUrl: profileImageUrl || existing.profileImageUrl,
          passwordHash,
          roles,
          isEmailVerified: false,
          emailVerifyToken: verifyToken,
          emailVerifyExpires: verifyExpires,
        },
      });
    } else {
      customer = await db.customer.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address?.trim() || null,
          profileImageUrl: profileImageUrl || null,
          passwordHash,
          roles: ["AGGREGATOR"],
          isEmailVerified: false,
          emailVerifyToken: verifyToken,
          emailVerifyExpires: verifyExpires,
        },
      });
    }

    // Send verification email
    await sendAggregatorVerifyEmail({
      to: email.trim(),
      name: name.trim(),
      code: verifyToken,
    });

    const token = await signAggregatorToken({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      profileImageUrl: customer.profileImageUrl,
      isEmailVerified: false,
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
        isEmailVerified: false,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[AGGREGATOR_REGISTER]", error);
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
