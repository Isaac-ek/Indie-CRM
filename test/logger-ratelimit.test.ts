import assert from "node:assert/strict";
import { test } from "node:test";
import { createChildLogger, logInfo, logWarn, logError } from "../src/lib/logger";
import { checkRateLimit, resetInMemoryRateLimiter, RATE_LIMIT_TIERS } from "../src/lib/rate-limit";
import { enqueueJob, clearQueue, getPendingJobs } from "../src/lib/queue";

test("Pino logger exports and context child logger", () => {
  assert.equal(typeof logInfo, "function");
  assert.equal(typeof logWarn, "function");
  assert.equal(typeof logError, "function");

  const child = createChildLogger({ requestId: "req-123", tenantId: "tenant-abc" });
  assert.equal(typeof child.info, "function");
  assert.equal(typeof child.warn, "function");
  assert.equal(typeof child.error, "function");
});

test("Pino logger handles Error instances cleanly without throwing", () => {
  assert.doesNotThrow(() => {
    logError("Database connection failed", new Error("Connection timeout"), {
      tenantId: "tenant-999",
      requestId: "req-error-test",
    });
  });
});

test("Rate limiter enforces request limits and resets for AUTH tier", async () => {
  resetInMemoryRateLimiter();
  const clientKey = "test-client-ip-1";

  // AUTH tier allows 5 requests
  for (let i = 0; i < 5; i++) {
    const res = await checkRateLimit(clientKey, "AUTH");
    assert.equal(res.success, true);
    assert.equal(res.limit, 5);
    assert.equal(res.remaining, 5 - (i + 1));
  }

  // 6th request should fail rate limit check
  const overflowRes = await checkRateLimit(clientKey, "AUTH");
  assert.equal(overflowRes.success, false);
  assert.equal(overflowRes.remaining, 0);
  assert.equal(overflowRes.limit, 5);
});

test("Rate limiter enforces request limits for AI_VECTOR and GENERAL tiers", async () => {
  resetInMemoryRateLimiter();
  const clientKeyVector = "user-123-vector";
  const clientKeyGeneral = "user-123-general";

  assert.equal(RATE_LIMIT_TIERS.AI_VECTOR.maxRequests, 20);
  assert.equal(RATE_LIMIT_TIERS.GENERAL.maxRequests, 200);

  const vectorRes = await checkRateLimit(clientKeyVector, "AI_VECTOR");
  assert.equal(vectorRes.success, true);
  assert.equal(vectorRes.limit, 20);
  assert.equal(vectorRes.remaining, 19);

  const generalRes = await checkRateLimit(clientKeyGeneral, "GENERAL");
  assert.equal(generalRes.success, true);
  assert.equal(generalRes.limit, 200);
  assert.equal(generalRes.remaining, 199);
});

test("Rate limiter resetInMemoryRateLimiter clears stored rate limit counters", async () => {
  resetInMemoryRateLimiter();
  const clientKey = "test-client-reset";

  for (let i = 0; i < 5; i++) {
    await checkRateLimit(clientKey, "AUTH");
  }

  const blockedRes = await checkRateLimit(clientKey, "AUTH");
  assert.equal(blockedRes.success, false);

  resetInMemoryRateLimiter();

  const resetRes = await checkRateLimit(clientKey, "AUTH");
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.remaining, 4);
});

test("Background queue preserves request ID context", () => {
  clearQueue();
  const requestId = "req-test-uuid-999";

  const job = enqueueJob({
    tenantId: "tenant-test-1",
    type: "AI_SUMMARY_GENERATION",
    payload: { leadId: "lead-123" },
    requestId,
  });

  assert.equal(job.requestId, requestId);
  assert.equal(job.tenantId, "tenant-test-1");

  const pending = getPendingJobs();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].requestId, requestId);
});
