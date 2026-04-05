import { EventEmitter } from "events";
import { db } from "./db";
import type { Prisma } from "../app/generated/prisma/client";

const globalEmitter = globalThis as unknown as { __sseEmitter: EventEmitter };

if (!globalEmitter.__sseEmitter) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  globalEmitter.__sseEmitter = emitter;
}

export const sseEmitter = globalEmitter.__sseEmitter;

export type SseEventType =
  | "ORDER_NEW"
  | "ORDER_UPDATED"
  | "PAYMENT_CONFIRMED"
  | "LOW_STOCK"
  | "CREDIT_OVERDUE"
  | "TRANSFER_REQUEST"
  | "AGGREGATOR_NEW"
  | "SYSTEM";

export interface SseEvent {
  type: SseEventType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function pushNotification(event: SseEvent) {
  sseEmitter.emit("notification", event);

  db.notification
    .create({
      data: {
        type: event.type,
        title: event.title,
        message: event.message,
        metadata: (event.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    })
    .catch((err) => console.error("[NOTIFICATION_PERSIST]", err));
}
