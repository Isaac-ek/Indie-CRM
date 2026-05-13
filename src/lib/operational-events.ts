import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";

export async function createOperationalEvent(params: {
  tenantId: string;
  source: string;
  level?: "error" | "warn" | "info";
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return getPrismaClient().operationalEvent.create({
    data: {
      tenantId: params.tenantId,
      source: params.source,
      level: params.level ?? "error",
      message: params.message,
      metadata: params.metadata,
    },
  });
}
