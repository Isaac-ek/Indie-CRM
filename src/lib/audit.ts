import { AuditLogAction, Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";

export async function createAuditLog(params: {
  tenantId: string;
  actorUserId?: string | null;
  action: AuditLogAction;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return getPrismaClient().auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      summary: params.summary,
      metadata: params.metadata,
    },
  });
}
