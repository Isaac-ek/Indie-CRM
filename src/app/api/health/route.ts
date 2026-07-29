import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();
  let dbHealthy = false;
  let dbError: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : "Database connection failed";
    }
  } else {
    dbError = "DATABASE_URL not configured";
  }

  const status = dbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: dbHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      environment: process.env.NODE_ENV ?? "development",
      services: {
        database: {
          status: dbHealthy ? "healthy" : "unhealthy",
          error: dbError,
        },
      },
    },
    { status }
  );
}
