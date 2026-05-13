import {
  LeadPriority,
  LeadSource,
  LeadStage,
  MessageDirection,
  WebhookEventStatus,
} from "@/generated/prisma/client";
import { generateLeadIntelligence, upsertMessageEmbedding } from "@/lib/ai";
import { createOperationalEvent } from "@/lib/operational-events";
import { getPrismaClient } from "@/lib/prisma";

const DEFAULT_WEBHOOK_MAX_RETRIES = 5;

function getNextRetryAt(retryCount: number, maxRetries: number) {
  if (retryCount >= maxRetries) {
    return null;
  }

  const backoffMinutes = Math.min(2 ** Math.max(retryCount - 1, 0), 60);
  return new Date(Date.now() + backoffMinutes * 60 * 1000);
}

type FormWebhookPayload = {
  name: string;
  email: string;
  company?: string | null;
  title?: string | null;
  message: string;
  source?: string | null;
  priority?: string | null;
};

function normalizeRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseWebhookSource(value: string | null | undefined) {
  switch ((value ?? "").trim().toUpperCase()) {
    case "MANUAL":
      return LeadSource.MANUAL;
    case "EMAIL":
      return LeadSource.EMAIL;
    case "REFERRAL":
      return LeadSource.REFERRAL;
    case "IMPORT":
      return LeadSource.IMPORT;
    case "FORM":
    case "":
      return LeadSource.FORM;
    default:
      throw new Error("Invalid source value.");
  }
}

function parseWebhookPriority(value: string | null | undefined) {
  switch ((value ?? "").trim().toUpperCase()) {
    case "LOW":
      return LeadPriority.LOW;
    case "HIGH":
      return LeadPriority.HIGH;
    case "URGENT":
      return LeadPriority.URGENT;
    case "MEDIUM":
    case "":
      return LeadPriority.MEDIUM;
    default:
      throw new Error("Invalid priority value.");
  }
}

export function parseFormWebhookPayload(input: unknown): FormWebhookPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Webhook payload must be a JSON object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    name: normalizeRequiredString(payload.name, "name"),
    email: normalizeRequiredString(payload.email, "email").toLowerCase(),
    company: normalizeOptionalString(payload.company),
    title: normalizeOptionalString(payload.title),
    message: normalizeRequiredString(payload.message, "message"),
    source: normalizeOptionalString(payload.source),
    priority: normalizeOptionalString(payload.priority),
  };
}

export async function storeFormWebhookEvent(params: {
  tenantId: string;
  payload: FormWebhookPayload;
}) {
  const prisma = getPrismaClient();

  return prisma.webhookEvent.create({
    data: {
      tenantId: params.tenantId,
      source: "form",
      eventType: "lead.submitted",
      payload: params.payload,
      status: WebhookEventStatus.PENDING,
      maxRetries: DEFAULT_WEBHOOK_MAX_RETRIES,
    },
    select: {
      id: true,
      receivedAt: true,
      status: true,
    },
  });
}

export async function processFormWebhookEvent(eventId: string) {
  const prisma = getPrismaClient();
  const now = new Date();
  const claimedEvent = await prisma.$transaction(async (tx) => {
    const current = await tx.webhookEvent.findUnique({
      where: { id: eventId },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    if (!current) {
      return null;
    }

    if (current.status === WebhookEventStatus.PROCESSED) {
      return current;
    }

    if (current.status === WebhookEventStatus.FAILED) {
      const retriesExhausted = current.retryCount >= current.maxRetries;
      const retryNotDue = current.nextRetryAt && current.nextRetryAt.getTime() > now.getTime();

      if (retriesExhausted || retryNotDue) {
        return current;
      }
    }

    return tx.webhookEvent.update({
      where: { id: current.id },
      data: {
        lastAttemptAt: now,
        retryCount: {
          increment: 1,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });
  });

  if (!claimedEvent) {
    throw new Error("Webhook event not found.");
  }

  if (claimedEvent.status === WebhookEventStatus.PROCESSED) {
    return {
      eventId: claimedEvent.id,
      leadId: null,
      tenantSlug: claimedEvent.tenant.slug,
      status: WebhookEventStatus.PROCESSED,
      skipped: "already_processed" as const,
    };
  }

  if (
    claimedEvent.status === WebhookEventStatus.FAILED &&
    (claimedEvent.retryCount >= claimedEvent.maxRetries ||
      (claimedEvent.nextRetryAt && claimedEvent.nextRetryAt.getTime() > now.getTime()))
  ) {
    return {
      eventId: claimedEvent.id,
      leadId: null,
      tenantSlug: claimedEvent.tenant.slug,
      status: claimedEvent.status,
      skipped:
        claimedEvent.retryCount >= claimedEvent.maxRetries
          ? ("retry_exhausted" as const)
          : ("retry_not_due" as const),
    };
  }

  const payload = parseFormWebhookPayload(claimedEvent.payload);

  try {
    const contact = await prisma.contact.upsert({
      where: {
        tenantId_email: {
          tenantId: claimedEvent.tenantId,
          email: payload.email,
        },
      },
      update: {
        name: payload.name,
        company: payload.company,
      },
      create: {
        tenantId: claimedEvent.tenantId,
        email: payload.email,
        name: payload.name,
        company: payload.company,
      },
    });

    const lead = await prisma.lead.create({
      data: {
        tenantId: claimedEvent.tenantId,
        contactId: contact.id,
        title: payload.title ?? (payload.company ? `${payload.company} inquiry` : `${payload.name} inquiry`),
        source: parseWebhookSource(payload.source),
        priority: parseWebhookPriority(payload.priority),
        stage: LeadStage.NEW,
        summary: payload.message,
        lastContactAt: new Date(),
      },
      select: {
        id: true,
        title: true,
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        tenantId: claimedEvent.tenantId,
        contactId: contact.id,
        leadId: lead.id,
        subject: lead.title,
        channel: "form",
        lastMessageAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    const message = await prisma.message.create({
      data: {
        tenantId: claimedEvent.tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        content: payload.message,
      },
    });

    await upsertMessageEmbedding({
      tenantId: claimedEvent.tenantId,
      messageId: message.id,
      content: payload.message,
    });

    await generateLeadIntelligence({
      tenantId: claimedEvent.tenantId,
      leadId: lead.id,
      requestedById: null,
      contactName: payload.name,
      company: payload.company ?? null,
      inquiry: payload.message,
    });

    await prisma.webhookEvent.update({
      where: { id: claimedEvent.id },
      data: {
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
        errorMessage: null,
        nextRetryAt: null,
      },
    });

    return {
      eventId: claimedEvent.id,
      leadId: lead.id,
      tenantSlug: claimedEvent.tenant.slug,
      status: WebhookEventStatus.PROCESSED,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    const nextRetryAt = getNextRetryAt(claimedEvent.retryCount, claimedEvent.maxRetries);

    await prisma.webhookEvent.update({
      where: { id: claimedEvent.id },
      data: {
        status: WebhookEventStatus.FAILED,
        errorMessage: message,
        nextRetryAt,
      },
    });

    await createOperationalEvent({
      tenantId: claimedEvent.tenantId,
      source: "webhook.processing",
      message,
      metadata: {
        eventId: claimedEvent.id,
        eventType: claimedEvent.eventType,
        retryCount: claimedEvent.retryCount,
        maxRetries: claimedEvent.maxRetries,
        nextRetryAt: nextRetryAt?.toISOString() ?? null,
      },
    });

    throw error;
  }
}

export function queueProcessFormWebhookEvent(eventId: string) {
  Promise.resolve()
    .then(async () => processFormWebhookEvent(eventId))
    .catch(() => {
      return null;
    });
}

export async function processPendingWebhookEvents(params: {
  tenantId: string;
  limit?: number;
}) {
  const prisma = getPrismaClient();
  const now = new Date();
  const events = await prisma.webhookEvent.findMany({
    where: {
      tenantId: params.tenantId,
      OR: [
        {
          status: WebhookEventStatus.PENDING,
        },
        {
          status: WebhookEventStatus.FAILED,
          retryCount: {
            lt: DEFAULT_WEBHOOK_MAX_RETRIES,
          },
          OR: [
            {
              nextRetryAt: null,
            },
            {
              nextRetryAt: {
                lte: now,
              },
            },
          ],
        },
      ],
    },
    orderBy: {
      receivedAt: "asc",
    },
    take: params.limit ?? 10,
    select: {
      id: true,
    },
  });

  let processed = 0;
  let failed = 0;
  let exhausted = 0;

  for (const event of events) {
    try {
      const result = await processFormWebhookEvent(event.id);

      if (result.status === WebhookEventStatus.PROCESSED) {
        processed += 1;
      } else if (result.skipped === "retry_exhausted") {
        exhausted += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    processed,
    failed,
    exhausted,
    attempted: events.length,
  };
}

export async function processWebhookQueueAcrossTenants(limitPerTenant = 20) {
  const prisma = getPrismaClient();
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      slug: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const workspaces = [];
  let processed = 0;
  let failed = 0;
  let exhausted = 0;
  let attempted = 0;

  for (const tenant of tenants) {
    const result = await processPendingWebhookEvents({
      tenantId: tenant.id,
      limit: limitPerTenant,
    });

    processed += result.processed;
    failed += result.failed;
    exhausted += result.exhausted;
    attempted += result.attempted;
    workspaces.push({
      workspaceSlug: tenant.slug,
      ...result,
    });
  }

  return {
    processed,
    failed,
    exhausted,
    attempted,
    workspaces,
  };
}
