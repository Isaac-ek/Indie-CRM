import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import {
  parseFormWebhookPayload,
  queueProcessFormWebhookEvent,
  storeFormWebhookEvent,
} from "@/lib/webhook-ingestion";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.FORM_WEBHOOK_SECRET;

  if (!configuredSecret) {
    return true;
  }

  return request.headers.get("x-indie-crm-secret") === configuredSecret;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workspaceSlug: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Webhook ingestion requires a configured database." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  const { workspaceSlug } = await context.params;

  try {
    const payload = parseFormWebhookPayload(await request.json());
    const prisma = getPrismaClient();
    const tenant = await prisma.tenant.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const event = await storeFormWebhookEvent({
      tenantId: tenant.id,
      payload,
    });

    queueProcessFormWebhookEvent(event.id);

    return NextResponse.json(
      {
        ok: true,
        workspaceSlug: tenant.slug,
        eventId: event.id,
        status: event.status,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
