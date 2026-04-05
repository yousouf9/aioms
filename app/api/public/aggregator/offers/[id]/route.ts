import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAggregatorSession } from "@/lib/aggregator-auth";
import { pushNotification } from "@/lib/sse-emitter";

// GET — single offer detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const offer = await db.aggregatorOffer.findUnique({
      where: { id, customerId: session.id },
      include: {
        deliveries: { orderBy: { deliveryDate: "desc" } },
        negotiations: { orderBy: { round: "asc" } },
      },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: offer.id,
        productName: offer.productName,
        quantity: offer.quantity.toNumber(),
        unit: offer.unit,
        offeredPrice: offer.offeredPrice.toNumber(),
        counterPrice: offer.counterPrice?.toNumber() ?? null,
        counterQuantity: offer.counterQuantity?.toNumber() ?? null,
        agreedPrice: offer.agreedPrice?.toNumber() ?? null,
        agreedQuantity: offer.agreedQuantity?.toNumber() ?? null,
        status: offer.status,
        advancePaid: offer.advancePaid.toNumber(),
        totalPaid: offer.totalPaid.toNumber(),
        productImages: offer.productImages,
        agreementDocUrl: offer.agreementDocUrl,
        signedAgreementDocUrl: offer.signedAgreementDocUrl,
        agreementRejectionReason: offer.agreementRejectionReason,
        agreementSentAt: offer.agreementSentAt?.toISOString() ?? null,
        agreementSignedAt: offer.agreementSignedAt?.toISOString() ?? null,
        suppliedAt: offer.suppliedAt?.toISOString() ?? null,
        completedAt: offer.completedAt?.toISOString() ?? null,
        notes: offer.notes,
        createdAt: offer.createdAt.toISOString(),
        totalDelivered: offer.deliveries.reduce((s, d) => s + d.quantityDelivered.toNumber(), 0),
        deliveries: offer.deliveries.map((d) => ({
          id: d.id,
          quantityDelivered: d.quantityDelivered.toNumber(),
          unit: d.unit,
          deliveryDate: d.deliveryDate.toISOString(),
          notes: d.notes,
        })),
        negotiations: offer.negotiations.map((n) => ({
          id: n.id,
          round: n.round,
          by: n.by,
          action: n.action,
          price: n.price.toNumber(),
          quantity: n.quantity.toNumber(),
          unit: n.unit,
          note: n.note,
          createdAt: n.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[AGGREGATOR_OFFER_GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load offer" }, { status: 500 });
  }
}

// PATCH — aggregator actions on their offer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAggregatorSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action, newPrice, newQuantity, signedAgreementDocUrl } = await request.json();

    const offer = await db.aggregatorOffer.findUnique({
      where: { id, customerId: session.id },
      include: { negotiations: { orderBy: { round: "desc" }, take: 1 } },
    });

    const nextRound = (offer?.negotiations[0]?.round ?? 0) + 1;

    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    switch (action) {
      // Aggregator accepts a counter-offer from Agro Hub
      case "ACCEPT_COUNTER": {
        if (offer.status !== "COUNTERED" || !offer.counterPrice) {
          return NextResponse.json(
            { success: false, error: "No counter-offer to accept" },
            { status: 400 }
          );
        }
        const agreedPrice = offer.counterPrice!;
        const agreedQuantity = offer.counterQuantity ?? offer.quantity;
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id },
            data: { agreedPrice, agreedQuantity, status: "ACCEPTED" },
          }),
          db.offerNegotiation.create({
            data: { offerId: id, round: nextRound, by: "AGGREGATOR", action: "ACCEPT", price: agreedPrice, quantity: agreedQuantity, unit: offer.unit },
          }),
        ]);
        pushNotification({
          type: "AGGREGATOR_NEW",
          title: "Aggregator accepted counter",
          message: `${session.name} accepted the counter-offer for ${offer.productName}`,
          metadata: { offerId: id },
        });
        return NextResponse.json({
          success: true,
          data: {
            status: updated.status,
            agreedPrice: updated.agreedPrice?.toNumber(),
            agreedQuantity: updated.agreedQuantity?.toNumber(),
          },
        });
      }

      // Aggregator rejects a counter-offer — terminal
      case "REJECT_COUNTER": {
        if (offer.status !== "COUNTERED") {
          return NextResponse.json(
            { success: false, error: "No counter-offer to reject" },
            { status: 400 }
          );
        }
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id },
            data: { status: "REJECTED" },
          }),
          db.offerNegotiation.create({
            data: { offerId: id, round: nextRound, by: "AGGREGATOR", action: "REJECT", price: offer.counterPrice ?? offer.offeredPrice, quantity: offer.counterQuantity ?? offer.quantity, unit: offer.unit },
          }),
        ]);
        pushNotification({
          type: "AGGREGATOR_NEW",
          title: "Aggregator rejected counter",
          message: `${session.name} rejected the counter-offer for ${offer.productName}`,
          metadata: { offerId: id },
        });
        return NextResponse.json({
          success: true,
          data: { status: updated.status },
        });
      }

      // Aggregator counters back with a new price and/or quantity — back to PENDING
      case "COUNTER_BACK": {
        if (offer.status !== "COUNTERED") {
          return NextResponse.json(
            { success: false, error: "Can only counter back when a counter-offer is active" },
            { status: 400 }
          );
        }
        if (!newPrice && !newQuantity) {
          return NextResponse.json(
            { success: false, error: "Provide a new price and/or quantity" },
            { status: 400 }
          );
        }
        const cbPrice = newPrice ? parseFloat(String(newPrice)) : offer.offeredPrice.toNumber();
        const cbQty = newQuantity ? parseFloat(String(newQuantity)) : offer.quantity.toNumber();
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id },
            data: {
              offeredPrice: cbPrice,
              quantity: cbQty,
              counterPrice: null,
              counterQuantity: null,
              status: "PENDING",
            },
          }),
          db.offerNegotiation.create({
            data: { offerId: id, round: nextRound, by: "AGGREGATOR", action: "COUNTER", price: cbPrice, quantity: cbQty, unit: offer.unit },
          }),
        ]);
        pushNotification({
          type: "AGGREGATOR_NEW",
          title: "Aggregator countered back",
          message: `${session.name} sent a counter-proposal for ${offer.productName}`,
          metadata: { offerId: id },
        });
        return NextResponse.json({
          success: true,
          data: {
            status: updated.status,
            offeredPrice: updated.offeredPrice.toNumber(),
            quantity: updated.quantity.toNumber(),
          },
        });
      }

      // Aggregator uploads signed agreement document
      case "UPLOAD_SIGNED_AGREEMENT": {
        if (offer.status !== "AGREEMENT_SENT") {
          return NextResponse.json(
            { success: false, error: "No agreement document to sign" },
            { status: 400 }
          );
        }
        if (!signedAgreementDocUrl) {
          return NextResponse.json(
            { success: false, error: "Signed agreement document is required" },
            { status: 400 }
          );
        }
        const updated = await db.aggregatorOffer.update({
          where: { id },
          data: { signedAgreementDocUrl, status: "AGREEMENT_UPLOADED", agreementRejectionReason: null },
        });
        pushNotification({
          type: "AGGREGATOR_NEW",
          title: "Signed agreement uploaded",
          message: `${session.name} uploaded a signed agreement for ${offer.productName} — awaiting review`,
          metadata: { offerId: id },
        });
        return NextResponse.json({
          success: true,
          data: { status: updated.status, signedAgreementDocUrl: updated.signedAgreementDocUrl },
        });
      }

      // Aggregator withdraws a pending offer
      case "WITHDRAW": {
        if (offer.status !== "PENDING") {
          return NextResponse.json(
            { success: false, error: "Can only withdraw pending offers" },
            { status: 400 }
          );
        }
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id },
            data: { status: "REJECTED" },
          }),
          db.offerNegotiation.create({
            data: { offerId: id, round: nextRound, by: "AGGREGATOR", action: "WITHDRAW", price: offer.offeredPrice, quantity: offer.quantity, unit: offer.unit },
          }),
        ]);
        pushNotification({
          type: "AGGREGATOR_NEW",
          title: "Aggregator withdrew offer",
          message: `${session.name} withdrew their offer for ${offer.productName}`,
          metadata: { offerId: id },
        });
        return NextResponse.json({
          success: true,
          data: { status: updated.status },
        });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[AGGREGATOR_OFFER_PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to update offer" }, { status: 500 });
  }
}
