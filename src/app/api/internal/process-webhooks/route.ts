import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import {
  processPendingWebhookEvents,
  processWebhookQueueAcrossTenants,
} from "@/lib/webhook-ingestion";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET;

  if (!configuredSecret) {
    return false;
  }

  return request.headers.get("x-internal-secret") === configuredSecret;
}

function parseLimit(value: string | null) {
  if (!value) {
    return 20;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 20;
  }

  return Math.min(parsed, 100);
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Webhook processing requires a configured database." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized internal processing request." }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceSlug = url.searchParams.get("workspaceSlug");
  const limit = parseLimit(url.searchParams.get("limit"));
  const prisma = getPrismaClient();

  const tenant = workspaceSlug
    ? await prisma.tenant.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true, slug: true },
      })
    : null;

  if (workspaceSlug && !tenant) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  if (tenant) {
    const result = await processPendingWebhookEvents({
      tenantId: tenant.id,
      limit,
    });

    return NextResponse.json({
      ok: true,
      workspaceSlug: tenant.slug,
      ...result,
    });
  }

  const result = await processWebhookQueueAcrossTenants(limit);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
