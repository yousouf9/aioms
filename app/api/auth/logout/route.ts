import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json<ApiResponse>({ success: true, message: "Logged out" });
}
