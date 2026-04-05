import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { sendAggregatorOfferUpdate, type AggregatorOfferEvent } from "@/lib/email";
import { pushNotification } from "@/lib/sse-emitter";
import { formatCurrency } from "@/lib/utils";

async function notifyAggregator(offerId: string, event: AggregatorOfferEvent, details?: string) {
  try {
    const offer = await db.aggregatorOffer.findUnique({
      where: { id: offerId },
      select: { productName: true, customer: { select: { email: true, name: true } } },
    });
    if (offer?.customer.email) {
      await sendAggregatorOfferUpdate({
        to: offer.customer.email,
        name: offer.customer.name,
        event,
        offerId,
        productName: offer.productName,
        details,
      });
    }
  } catch (err) {
    console.error("[NOTIFY_AGGREGATOR]", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "aggregators", "view");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search")?.trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [offers, total] = await Promise.all([
      db.aggregatorOffer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          deliveries: { orderBy: { deliveryDate: "desc" } },
          _count: { select: { deliveries: true } },
        },
      }),
      db.aggregatorOffer.count({ where }),
    ]);

    // Get status counts for tabs (unfiltered by status but respecting search/customer filters)
    const countWhere: Record<string, unknown> = {};
    if (customerId) countWhere.customerId = customerId;
    if (search) {
      countWhere.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const statusCounts = await db.aggregatorOffer.groupBy({
      by: ["status"],
      where: countWhere,
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count._all; });

    return NextResponse.json({
      success: true,
      data: offers.map((o) => {
        const totalDelivered = o.deliveries.reduce((s, d) => s + d.quantityDelivered.toNumber(), 0);
        const agreedQty = o.agreedQuantity?.toNumber() ?? o.quantity.toNumber();
        const agreedPrc = o.agreedPrice?.toNumber() ?? o.offeredPrice.toNumber();
        const dealValue = agreedPrc * agreedQty;
        return {
          ...o,
          quantity: o.quantity.toNumber(),
          offeredPrice: o.offeredPrice.toNumber(),
          counterPrice: o.counterPrice?.toNumber() ?? null,
          counterQuantity: o.counterQuantity?.toNumber() ?? null,
          agreedPrice: o.agreedPrice?.toNumber() ?? null,
          agreedQuantity: o.agreedQuantity?.toNumber() ?? null,
          advancePaid: o.advancePaid.toNumber(),
          totalPaid: o.totalPaid.toNumber(),
          totalDelivered,
          dealValue,
          deliveries: o.deliveries.map((d) => ({ ...d, quantityDelivered: d.quantityDelivered.toNumber() })),
        };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    });
  } catch (error) {
    console.error("[GET_AGGREGATORS]", error);
    return NextResponse.json({ success: false, error: "Failed to load offers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "aggregators", "create");
    if (denied) return denied;

    const body = await req.json();
    const { customerId, productName, quantity, unit, offeredPrice, notes, productImages } = body;

    if (!customerId || !productName?.trim() || !quantity || !unit || !offeredPrice) {
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 });
    }

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    if (!customer.roles.includes("AGGREGATOR")) {
      await db.customer.update({ where: { id: customerId }, data: { roles: { push: "AGGREGATOR" } } });
    }

    const offer = await db.aggregatorOffer.create({
      data: {
        customerId,
        productName: productName.trim(),
        quantity: parseFloat(String(quantity)),
        unit: unit.trim(),
        offeredPrice: parseFloat(String(offeredPrice)),
        notes: notes?.trim() || null,
        productImages: Array.isArray(productImages) ? productImages.filter(Boolean) : [],
      },
      include: { customer: { select: { name: true, phone: true } } },
    });

    return NextResponse.json({
      success: true,
      data: { ...offer, quantity: offer.quantity.toNumber(), offeredPrice: offer.offeredPrice.toNumber(), advancePaid: offer.advancePaid.toNumber(), totalPaid: offer.totalPaid.toNumber() },
    }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_OFFER]", error);
    return NextResponse.json({ success: false, error: "Failed to create offer" }, { status: 500 });
  }
}

// Update offer status (counter, accept, reject, sign, supply, payment, delivery, complete)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "aggregators", "update");
    if (denied) return denied;

    const body = await req.json();
    const { offerId, action, counterPrice, counterQuantity, advanceAmount, paymentAmount, delivery, agreementDocUrl, rejectionReason } = body;

    if (!offerId || !action) {
      return NextResponse.json({ success: false, error: "Offer ID and action are required" }, { status: 400 });
    }

    const offer = await db.aggregatorOffer.findUnique({
      where: { id: offerId },
      include: { deliveries: true, negotiations: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!offer) return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });

    const nextRound = (offer.negotiations[0]?.round ?? 0) + 1;

    switch (action) {
      case "COUNTER": {
        if (!counterPrice && !counterQuantity) {
          return NextResponse.json({ success: false, error: "Counter price or quantity is required" }, { status: 400 });
        }
        if (offer.status !== "PENDING") {
          return NextResponse.json({ success: false, error: "Can only counter pending offers" }, { status: 400 });
        }
        const cp = counterPrice ? parseFloat(String(counterPrice)) : offer.offeredPrice.toNumber();
        const cq = counterQuantity ? parseFloat(String(counterQuantity)) : offer.quantity.toNumber();
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id: offerId },
            data: { counterPrice: cp, counterQuantity: cq, status: "COUNTERED" },
          }),
          db.offerNegotiation.create({
            data: { offerId, round: nextRound, by: "ADMIN", action: "COUNTER", price: cp, quantity: cq, unit: offer.unit },
          }),
        ]);
        notifyAggregator(offerId, "COUNTER");
        return NextResponse.json({ success: true, data: updated });
      }

      case "ACCEPT": {
        if (offer.status !== "PENDING") {
          return NextResponse.json({ success: false, error: "Can only accept pending offers" }, { status: 400 });
        }
        const agreedPrice = offer.counterPrice ?? offer.offeredPrice;
        const agreedQuantity = offer.counterQuantity ?? offer.quantity;
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id: offerId },
            data: { agreedPrice, agreedQuantity, status: "ACCEPTED" },
          }),
          db.offerNegotiation.create({
            data: { offerId, round: nextRound, by: "ADMIN", action: "ACCEPT", price: agreedPrice, quantity: agreedQuantity, unit: offer.unit },
          }),
        ]);
        notifyAggregator(offerId, "ACCEPT");
        return NextResponse.json({ success: true, data: updated });
      }

      case "REJECT": {
        if (!["PENDING", "COUNTERED"].includes(offer.status)) {
          return NextResponse.json({ success: false, error: "Can only reject pending or countered offers" }, { status: 400 });
        }
        const [updated] = await Promise.all([
          db.aggregatorOffer.update({
            where: { id: offerId },
            data: { status: "REJECTED" },
          }),
          db.offerNegotiation.create({
            data: { offerId, round: nextRound, by: "ADMIN", action: "REJECT", price: offer.offeredPrice, quantity: offer.quantity, unit: offer.unit },
          }),
        ]);
        notifyAggregator(offerId, "REJECT");
        return NextResponse.json({ success: true, data: updated });
      }

      case "SEND_AGREEMENT": {
        if (offer.status !== "ACCEPTED") {
          return NextResponse.json({ success: false, error: "Offer must be accepted before sending agreement" }, { status: 400 });
        }
        if (!agreementDocUrl) {
          return NextResponse.json({ success: false, error: "Agreement document is required" }, { status: 400 });
        }
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { agreementDocUrl, agreementRejectionReason: null, status: "AGREEMENT_SENT", agreementSentAt: new Date() },
        });
        notifyAggregator(offerId, "SEND_AGREEMENT");
        return NextResponse.json({ success: true, data: updated });
      }

      case "APPROVE_AGREEMENT": {
        if (offer.status !== "AGREEMENT_UPLOADED") {
          return NextResponse.json({ success: false, error: "No signed agreement to approve" }, { status: 400 });
        }
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { status: "AGREEMENT_SIGNED", agreementSignedAt: new Date(), agreementRejectionReason: null },
        });
        notifyAggregator(offerId, "APPROVE_AGREEMENT");
        return NextResponse.json({ success: true, data: updated });
      }

      case "REJECT_AGREEMENT": {
        if (offer.status !== "AGREEMENT_UPLOADED") {
          return NextResponse.json({ success: false, error: "No signed agreement to reject" }, { status: 400 });
        }
        if (!rejectionReason?.trim()) {
          return NextResponse.json({ success: false, error: "Rejection reason is required" }, { status: 400 });
        }
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { status: "AGREEMENT_SENT", signedAgreementDocUrl: null, agreementRejectionReason: rejectionReason.trim() },
        });
        notifyAggregator(offerId, "REJECT_AGREEMENT", rejectionReason.trim());
        return NextResponse.json({ success: true, data: updated });
      }

      case "ADVANCE": {
        if (!["AGREEMENT_SIGNED", "SUPPLIED"].includes(offer.status)) {
          return NextResponse.json({ success: false, error: "Agreement must be signed first" }, { status: 400 });
        }
        if (!advanceAmount) return NextResponse.json({ success: false, error: "Advance amount is required" }, { status: 400 });
        const advAmt = parseFloat(String(advanceAmount));
        const newAdvance = offer.advancePaid.toNumber() + advAmt;
        const newTotalAfterAdvance = offer.totalPaid.toNumber() + advAmt;
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { advancePaid: newAdvance, totalPaid: newTotalAfterAdvance },
        });
        notifyAggregator(offerId, "ADVANCE", formatCurrency(advAmt));
        return NextResponse.json({ success: true, data: updated });
      }

      case "DELIVERY": {
        if (!["AGREEMENT_SIGNED"].includes(offer.status)) {
          return NextResponse.json({ success: false, error: "Agreement must be signed to record deliveries" }, { status: 400 });
        }
        if (!delivery?.quantityDelivered || !delivery?.unit) {
          return NextResponse.json({ success: false, error: "Delivery quantity and unit are required" }, { status: 400 });
        }

        const del = await db.aggregatorDelivery.create({
          data: {
            offerId,
            quantityDelivered: parseFloat(String(delivery.quantityDelivered)),
            unit: delivery.unit,
            notes: delivery.notes?.trim() || null,
            receivedById: session.id,
          },
        });

        // Check if all goods are now delivered — auto-mark as SUPPLIED
        const totalDelivered = offer.deliveries.reduce((s, d) => s + d.quantityDelivered.toNumber(), 0) + parseFloat(String(delivery.quantityDelivered));
        const targetQty = (offer.agreedQuantity ?? offer.quantity).toNumber();

        if (totalDelivered >= targetQty) {
          await db.aggregatorOffer.update({
            where: { id: offerId },
            data: { status: "SUPPLIED", suppliedAt: new Date() },
          });
        }

        notifyAggregator(offerId, "DELIVERY", `${delivery.quantityDelivered} ${delivery.unit}`);
        return NextResponse.json({ success: true, data: del, autoSupplied: totalDelivered >= targetQty });
      }

      case "MARK_SUPPLIED": {
        if (offer.status !== "AGREEMENT_SIGNED") {
          return NextResponse.json({ success: false, error: "Can only mark signed agreements as supplied" }, { status: 400 });
        }
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { status: "SUPPLIED", suppliedAt: new Date() },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case "RECORD_PAYMENT": {
        if (!["AGREEMENT_SIGNED", "SUPPLIED"].includes(offer.status)) {
          return NextResponse.json({ success: false, error: "Cannot record payment at this stage" }, { status: 400 });
        }
        if (!paymentAmount) return NextResponse.json({ success: false, error: "Payment amount is required" }, { status: 400 });
        const newTotal = offer.totalPaid.toNumber() + parseFloat(String(paymentAmount));
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { totalPaid: newTotal },
        });
        notifyAggregator(offerId, "PAYMENT", formatCurrency(parseFloat(String(paymentAmount))));
        return NextResponse.json({ success: true, data: updated });
      }

      case "MARK_COMPLETED": {
        if (offer.status !== "SUPPLIED") {
          return NextResponse.json({ success: false, error: "Goods must be fully supplied before completing" }, { status: 400 });
        }
        const updated = await db.aggregatorOffer.update({
          where: { id: offerId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        notifyAggregator(offerId, "COMPLETED");
        return NextResponse.json({ success: true, data: updated });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[UPDATE_OFFER]", error);
    return NextResponse.json({ success: false, error: "Failed to update offer" }, { status: 500 });
  }
}
