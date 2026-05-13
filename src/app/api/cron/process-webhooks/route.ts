import { NextRequest, NextResponse } from "next/server";
import { processWebhookQueueAcrossTenants } from "@/lib/webhook-ingestion";

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Webhook processing requires a configured database." },
      { status: 503 },
    );
  }

  if (!process.env.CRON_SECRET || !isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const limitParam = new URL(request.url).searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20;
  const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 100);
  const result = await processWebhookQueueAcrossTenants(limit);

  return NextResponse.json({
    ok: true,
    schedule: "vercel-cron",
    ...result,
  });
}
