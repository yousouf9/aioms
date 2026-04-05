import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { pushNotification } from "@/lib/sse-emitter";
import { sendOrderConfirmation } from "@/lib/email";
import { formatCurrency } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify signature
    const signature = request.headers.get("x-signature") ?? "";
    const encryptionKey = process.env.VALUEPAY_ENCRYPTION_KEY ?? "";
    const payloadStr = JSON.stringify(body);
    const expectedSig = createHmac("sha256", encryptionKey)
      .update(payloadStr)
      .digest("hex");

    if (signature !== expectedSig) {
      console.warn("[VALUEPAY_WEBHOOK] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const status: string = body.status ?? "";
    const eventType: string = body.event?.type ?? "";
    const isCompleted = status === "COMPLETED" || eventType === "transaction.completed";

    const webhookRef: string =
      body.transactionRef ?? body.tx_ref ?? body.txRef ?? body.reference ?? "";

    if (isCompleted && webhookRef) {
      const payment = await db.payment.findFirst({
        where: { valuepayRef: webhookRef },
      });

      if (payment && payment.status !== "PAID") {
        const { count } = await db.payment.updateMany({
          where: { id: payment.id, status: { not: "PAID" } },
          data: { status: "PAID", confirmedAt: new Date() },
        });

        if (count === 0) {
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Update associated order if exists
        if (payment.orderId) {
          const order = await db.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
            include: {
              items: { include: { product: { select: { name: true } } } },
            },
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
          message: `Online payment of ${formatCurrency(payment.amount.toNumber())} confirmed via Valuepay (ref: ${webhookRef})`,
          metadata: { paymentId: payment.id, transactionRef: webhookRef },
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[VALUEPAY_WEBHOOK]", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
