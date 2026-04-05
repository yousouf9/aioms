import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { ApiResponse, StaffSession } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unauthenticated" },
      { status: 401 }
    );
  }
  return NextResponse.json<ApiResponse<StaffSession>>({ success: true, data: session });
}
