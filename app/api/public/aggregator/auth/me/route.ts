import { NextResponse } from "next/server";
import { getAggregatorSession } from "@/lib/aggregator-auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, phone: true, email: true, address: true, roles: true, profileImageUrl: true, isEmailVerified: true },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("[AGGREGATOR_ME]", error);
    return NextResponse.json({ success: false, error: "Failed to get profile" }, { status: 500 });
  }
}
