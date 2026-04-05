import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import type { ApiResponse, StaffSession } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        roleName: true,
        isActive: true,
        mustResetPassword: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionPayload: StaffSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleName,
    };

    const token = await signToken(sessionPayload);
    await setSessionCookie(token);

    // If user must reset password, signal the client to redirect
    if (user.mustResetPassword) {
      return NextResponse.json({
        success: true,
        data: sessionPayload,
        mustResetPassword: true,
        message: "Password reset required",
      });
    }

    return NextResponse.json<ApiResponse<Omit<StaffSession, never>>>({
      success: true,
      data: sessionPayload,
      message: "Login successful",
    });
  } catch (error) {
    console.error("[LOGIN]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
