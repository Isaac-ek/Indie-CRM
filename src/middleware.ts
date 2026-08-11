import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { checkRateLimit, RateLimitTier } from "@/lib/rate-limit";
import { logInfo, logWarn } from "@/lib/logger";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith("/w/");
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isVectorSearchRoute = pathname.includes("/search");
  const isLoggedIn = !!req.auth;

  // Request ID extraction or generation
  const existingRequestId = req.headers.get("x-request-id");
  const requestId =
    existingRequestId ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Determine client identifier for rate limiting (IP or User ID)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  const rateLimitKey = isLoggedIn && req.auth?.user?.id ? req.auth.user.id : clientIp;

  // Select rate limiting tier
  let rateLimitTier: RateLimitTier = "GENERAL";
  if (isAuthRoute) {
    rateLimitTier = "AUTH";
  } else if (isVectorSearchRoute) {
    rateLimitTier = "AI_VECTOR";
  }

  // Check Rate Limit
  const rlResult = await checkRateLimit(rateLimitKey, rateLimitTier);

  if (!rlResult.success) {
    logWarn(`Rate limit exceeded for client: ${clientIp} on path: ${pathname}`, {
      requestId,
      clientIp,
      pathname,
      tier: rateLimitTier,
    });

    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please try again in ${rlResult.resetSeconds} seconds.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
          "Retry-After": String(rlResult.resetSeconds),
          "X-RateLimit-Limit": String(rlResult.limit),
          "X-RateLimit-Remaining": String(rlResult.remaining),
        },
      }
    );
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/w/northstar-studio", req.nextUrl.origin));
  }

  // Prepare response with request-id attached
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  logInfo(`Request processed: ${req.method} ${pathname}`, {
    requestId,
    clientIp,
    pathname,
  });

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  response.headers.set("X-RateLimit-Limit", String(rlResult.limit));
  response.headers.set("X-RateLimit-Remaining", String(rlResult.remaining));

  return response;
});

export const config = {
  matcher: ["/w/:path*", "/login", "/register"],
};
