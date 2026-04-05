import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAggregatorSession, clearAggregatorCookie, AGGREGATOR_COOKIE_NAME } from "@/lib/aggregator-auth";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AGGREGATOR_COOKIE_NAME)?.value;

    if (token) {
      await db.customerSession.deleteMany({ where: { token } }).catch(() => {});
    }

    await clearAggregatorCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGGREGATOR_LOGOUT]", error);
    return NextResponse.json({ success: true }); // always succeed logout
  }
}
