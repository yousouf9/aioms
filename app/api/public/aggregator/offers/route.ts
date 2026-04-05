import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAggregatorSession } from "@/lib/aggregator-auth";
import { pushNotification } from "@/lib/sse-emitter";
import { formatCurrency } from "@/lib/utils";

// GET — list my offers (paginated + filterable)
export async function GET(request: NextRequest) {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { customerId: session.id };
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.productName = { contains: search, mode: "insensitive" };
    }

    const [offers, total, statusCounts] = await Promise.all([
      db.aggregatorOffer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          deliveries: { orderBy: { deliveryDate: "desc" } },
          _count: { select: { deliveries: true } },
        },
      }),
      db.aggregatorOffer.count({ where }),
      db.aggregatorOffer.groupBy({
        by: ["status"],
        where: search
          ? { customerId: session.id, productName: { contains: search, mode: "insensitive" } }
          : { customerId: session.id },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count._all; });

    return NextResponse.json({
      success: true,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
      data: offers.map((o) => ({
        id: o.id,
        productName: o.productName,
        quantity: o.quantity.toNumber(),
        unit: o.unit,
        offeredPrice: o.offeredPrice.toNumber(),
        counterPrice: o.counterPrice?.toNumber() ?? null,
        counterQuantity: o.counterQuantity?.toNumber() ?? null,
        agreedPrice: o.agreedPrice?.toNumber() ?? null,
        agreedQuantity: o.agreedQuantity?.toNumber() ?? null,
        status: o.status,
        advancePaid: o.advancePaid.toNumber(),
        totalPaid: o.totalPaid.toNumber(),
        productImages: o.productImages,
        agreementDocUrl: o.agreementDocUrl,
        signedAgreementDocUrl: o.signedAgreementDocUrl,
        agreementRejectionReason: o.agreementRejectionReason,
        agreementSentAt: o.agreementSentAt?.toISOString() ?? null,
        agreementSignedAt: o.agreementSignedAt?.toISOString() ?? null,
        suppliedAt: o.suppliedAt?.toISOString() ?? null,
        completedAt: o.completedAt?.toISOString() ?? null,
        notes: o.notes,
        createdAt: o.createdAt.toISOString(),
        deliveryCount: o._count.deliveries,
        totalDelivered: o.deliveries.reduce((s, d) => s + d.quantityDelivered.toNumber(), 0),
        deliveries: o.deliveries.map((d) => ({
          id: d.id,
          quantityDelivered: d.quantityDelivered.toNumber(),
          unit: d.unit,
          deliveryDate: d.deliveryDate.toISOString(),
          notes: d.notes,
        })),
      })),
    });
  } catch (error) {
    console.error("[AGGREGATOR_OFFERS_GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load offers" }, { status: 500 });
  }
}

// POST — create a new offer
export async function POST(request: NextRequest) {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { productName, quantity, unit, offeredPrice, notes, productImages } = await request.json();

    if (!productName?.trim() || !quantity || !unit?.trim() || !offeredPrice) {
      return NextResponse.json(
        { success: false, error: "Product name, quantity, unit, and price are required" },
        { status: 400 }
      );
    }

    const qty = parseFloat(String(quantity));
    const price = parseFloat(String(offeredPrice));
    const trimmedUnit = unit.trim();

    const offer = await db.aggregatorOffer.create({
      data: {
        customerId: session.id,
        productName: productName.trim(),
        quantity: qty,
        unit: trimmedUnit,
        offeredPrice: price,
        notes: notes?.trim() || null,
        productImages: Array.isArray(productImages) ? productImages.filter(Boolean) : [],
      },
    });

    // Record initial negotiation entry
    await db.offerNegotiation.create({
      data: {
        offerId: offer.id,
        round: 1,
        by: "AGGREGATOR",
        action: "INITIAL",
        price,
        quantity: qty,
        unit: trimmedUnit,
      },
    });

    pushNotification({
      type: "AGGREGATOR_NEW",
      title: "New aggregator offer",
      message: `${session.name} offered ${qty} ${trimmedUnit} of ${offer.productName} at ${formatCurrency(price)}/${trimmedUnit}`,
      metadata: { offerId: offer.id, customerId: session.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: offer.id,
        productName: offer.productName,
        quantity: offer.quantity.toNumber(),
        unit: offer.unit,
        offeredPrice: offer.offeredPrice.toNumber(),
        status: offer.status,
        createdAt: offer.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[AGGREGATOR_OFFERS_POST]", error);
    return NextResponse.json({ success: false, error: "Failed to create offer" }, { status: 500 });
  }
}
