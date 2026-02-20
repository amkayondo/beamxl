import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

type AuditPayload = {
  orgId: string;
  actorType: "USER" | "SYSTEM" | "WEBHOOK";
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  correlationId?: string | null;
  before?: unknown;
  after?: unknown;
  ipHash?: string | null;
  userAgentHash?: string | null;
};

export async function writeAuditLog(payload: AuditPayload) {
  await db.insert(auditLogs).values({
    orgId: payload.orgId,
    actorType: payload.actorType,
    actorUserId: payload.actorUserId ?? null,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId,
    correlationId: payload.correlationId ?? null,
    before: payload.before as Record<string, unknown> | undefined,
    after: payload.after as Record<string, unknown> | undefined,
    ipHash: payload.ipHash ?? null,
    userAgentHash: payload.userAgentHash ?? null,
  });
}
