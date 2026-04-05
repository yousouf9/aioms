import { getSession } from "@/lib/auth";
import { sseEmitter, type SseEvent, type SseEventType } from "@/lib/sse-emitter";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Events each system role is allowed to see; custom roles default to STAFF-level
const ROLE_EVENTS: Record<string, SseEventType[] | "ALL"> = {
  SUPER_ADMIN: "ALL",
  MANAGER: "ALL",
  CASHIER: ["ORDER_NEW", "PAYMENT_CONFIRMED", "LOW_STOCK", "SYSTEM"],
  STAFF: ["SYSTEM"],
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const allowedEvents = ROLE_EVENTS[session.role] ?? "ALL";

  // Fetch initial unread count — graceful fallback if DB is waking up
  let unreadCount = 0;
  try {
    unreadCount = await db.notification.count({
      where: { recipientId: session.id, isRead: false },
    });
  } catch {
    // DB unreachable (e.g. Render cold start) — stream will still work
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event with unread count
      const connectMsg = `data: ${JSON.stringify({ type: "CONNECTED", unreadCount })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Send keepalive every 30s to prevent proxy timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30_000);

      // Forward SSE events to this client, filtered by role
      function onNotification(event: SseEvent) {
        if (allowedEvents !== "ALL" && !allowedEvents.includes(event.type)) {
          return; // skip events this role shouldn't see
        }
        try {
          const msg = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(msg));
        } catch {
          // client disconnected
        }
      }

      sseEmitter.on("notification", onNotification);

      // Cleanup on stream close
      return () => {
        clearInterval(keepalive);
        sseEmitter.off("notification", onNotification);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
