import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { sendOrderConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getSession();
  const denied = await requirePermission(session, "settings", "update");
  if (denied) return denied;

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
  }

  try {
    await sendOrderConfirmation({
      to: email,
      customerName: "Test Customer",
      orderCode: "AGR-TEST01",
      items: [
        { name: "Roundup Herbicide", quantity: 2, total: "₦5,000" },
        { name: "NPK 15:15:15 Fertilizer", quantity: 5, total: "₦12,500" },
      ],
      subtotal: "₦17,500",
      deliveryFee: "₦500",
      total: "₦18,000",
      deliveryMethod: "PICKUP",
    });

    return NextResponse.json({ success: true, message: `Test email sent to ${email}` });
  } catch (err) {
    console.error("[EMAIL_TEST]", err);
    return NextResponse.json({ success: false, error: "Failed to send test email" }, { status: 500 });
  }
}
