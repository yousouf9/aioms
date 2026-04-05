import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const denied = await requirePermission(session, "aggregators", "view");
    if (denied) return denied;

    const { id } = await params;

    const offer = await db.aggregatorOffer.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            profileImageUrl: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        deliveries: {
          orderBy: { deliveryDate: "desc" },
          include: { receivedBy: { select: { name: true } } },
        },
        negotiations: { orderBy: { round: "asc" } },
      },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    const totalDelivered = offer.deliveries.reduce((s, d) => s + d.quantityDelivered.toNumber(), 0);
    const agreedQty = offer.agreedQuantity?.toNumber() ?? offer.quantity.toNumber();
    const agreedPrc = offer.agreedPrice?.toNumber() ?? offer.offeredPrice.toNumber();
    const dealValue = agreedPrc * agreedQty;

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
        updatedAt: offer.updatedAt.toISOString(),
        totalDelivered,
        dealValue,
        customer: {
          ...offer.customer,
          createdAt: offer.customer.createdAt.toISOString(),
        },
        deliveries: offer.deliveries.map((d) => ({
          id: d.id,
          quantityDelivered: d.quantityDelivered.toNumber(),
          unit: d.unit,
          deliveryDate: d.deliveryDate.toISOString(),
          notes: d.notes,
          receivedBy: d.receivedBy.name,
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
    console.error("[GET_OFFER_DETAIL]", error);
    return NextResponse.json({ success: false, error: "Failed to load offer" }, { status: 500 });
  }
}
