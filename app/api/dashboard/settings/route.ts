import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "settings", "view");
    if (denied) return denied;

    const settings = await db.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        deliveryFee: settings.deliveryFee.toNumber(),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    const denied = await requirePermission(session, "settings", "update");
    if (denied) return denied;

    const body = await req.json();
    const {
      businessName, phone, whatsapp, email, address,
      googleMapsUrl, aboutText, deliveryFee, deliveryAreas,
      openingHours,
    } = body;

    const data: Record<string, unknown> = {};
    if (businessName !== undefined) data.businessName = businessName;
    if (phone !== undefined) data.phone = phone;
    if (whatsapp !== undefined) data.whatsapp = whatsapp;
    if (email !== undefined) data.email = email;
    if (address !== undefined) data.address = address;
    if (googleMapsUrl !== undefined) data.googleMapsUrl = googleMapsUrl;
    if (aboutText !== undefined) data.aboutText = aboutText;
    if (deliveryFee !== undefined) data.deliveryFee = parseFloat(String(deliveryFee));
    if (deliveryAreas !== undefined) data.deliveryAreas = deliveryAreas;
    if (openingHours !== undefined) data.openingHours = openingHours;

    const settings = await db.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        deliveryFee: settings.deliveryFee.toNumber(),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to save settings" }, { status: 500 });
  }
}
