import assert from "node:assert/strict";
import { test } from "node:test";
import { createChildLogger, logInfo, logWarn } from "../src/lib/logger";
import { checkRateLimit, resetInMemoryRateLimiter, RATE_LIMIT_TIERS } from "../src/lib/rate-limit";
import { enqueueJob, clearQueue, getPendingJobs } from "../src/lib/queue";

test("Pino logger exports and context child logger", () => {
  assert.equal(typeof logInfo, "function");
  assert.equal(typeof logWarn, "function");

  const child = createChildLogger({ requestId: "req-123", tenantId: "tenant-abc" });
  assert.equal(typeof child.info, "function");
  assert.equal(typeof child.error, "function");
});

test("Rate limiter enforces request limits and resets", async () => {
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
