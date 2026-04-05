import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/valuepay";
import { pushNotification } from "@/lib/sse-emitter";
import { rateLimit } from "@/lib/rate-limit";
import { sendOrderConfirmation } from "@/lib/email";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");

    if (!ref) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Reference required" },
        { status: 400 }
      );
    }

    const payment = await findPayment(ref);

    if (!payment) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status === "PAID") {
      return buildResponse(payment);
    }

    // Call Valuepay API directly to check status
    const vpData = await verifyTransaction(ref);

    if (vpData) {
      const vpStatus: string = vpData.status ?? "";
      const isPaid = vpStatus === "COMPLETED";

      if (isPaid) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", confirmedAt: new Date() },
        });

        if (payment.orderId) {
          const order = await db.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
            include: { items: { include: { product: { select: { name: true } } } } },
          });

          if (order.customerEmail) {
            await sendOrderConfirmation({
              to: order.customerEmail,
              customerName: order.customerName,
              orderCode: order.orderCode,
              items: order.items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                total: formatCurrency(i.total.toNumber()),
              })),
              subtotal: formatCurrency(order.subtotal.toNumber()),
              deliveryFee: formatCurrency(order.deliveryFee.toNumber()),
              total: formatCurrency(order.total.toNumber()),
              deliveryMethod: order.deliveryMethod,
            });
          }
        }

        pushNotification({
          type: "PAYMENT_CONFIRMED",
          title: "Payment Confirmed",
          message: `Online payment of ${formatCurrency(payment.amount.toNumber())} confirmed (ref: ${ref})`,
          metadata: { paymentId: payment.id, transactionRef: ref },
        });

        const updated = await findPayment(ref);
        return buildResponse(updated ?? payment, true);
      }
    }

    return buildResponse(payment);
  } catch (error) {
    console.error("[PAYMENT_VERIFY]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}

async function findPayment(ref: string) {
  return db.payment.findFirst({
    where: { valuepayRef: ref },
    select: {
      id: true,
      status: true,
      amount: true,
      source: true,
      confirmedAt: true,
      valuepayRef: true,
      orderId: true,
      order: {
        select: {
          orderCode: true,
          customerName: true,
          status: true,
          total: true,
        },
      },
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResponse(payment: any, forceStatus?: boolean) {
  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      status: forceStatus ? "PAID" : payment.status,
      amount: payment.amount.toNumber(),
      source: payment.source,
      confirmedAt: payment.confirmedAt?.toISOString() ?? null,
      order: payment.order
        ? {
            orderCode: payment.order.orderCode,
            customerName: payment.order.customerName,
            status: payment.order.status,
            total: payment.order.total.toNumber(),
          }
        : null,
    },
  });
}
