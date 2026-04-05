import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";

type AuditParams = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Write an audit log entry. Fire-and-forget — errors are logged but never
 * bubble up so they can't break the caller's flow.
 */
export function audit(params: AuditParams) {
  db.auditLog
    .create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
    .catch((err) => console.error("[AUDIT]", err));
}
