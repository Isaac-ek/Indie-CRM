import test from "node:test";
import assert from "node:assert/strict";
import {
  clearQueue,
  enqueueJob,
  getPendingJobs,
  processNextJob,
  registerJobHandler,
} from "@/lib/queue";

test("enqueues background jobs with pending status and metadata", () => {
  clearQueue();
  const job = enqueueJob({
    tenantId: "tenant-101",
    type: "FORM_WEBHOOK_INGESTION",
    payload: { leadName: "Jane Doe", email: "jane@test.com" },
  });

  assert.equal(job.tenantId, "tenant-101");
  assert.equal(job.type, "FORM_WEBHOOK_INGESTION");
  assert.equal(job.status, "pending");
  assert.equal(getPendingJobs().length, 1);
});

test("processes jobs successfully using registered handler", async () => {
  clearQueue();
  let executedPayload: Record<string, unknown> | null = null;

  registerJobHandler("FORM_WEBHOOK_INGESTION", async (job) => {
    executedPayload = job.payload;
    return { success: true };
  });

  const job = enqueueJob({
    tenantId: "tenant-101",
    type: "FORM_WEBHOOK_INGESTION",
    payload: { leadName: "Alice Smith" },
  });

  const result = await processNextJob();
  assert.equal(result.processed, true);
  assert.equal(result.status, "completed");
  assert.deepEqual(executedPayload, { leadName: "Alice Smith" });
  assert.equal(getPendingJobs().length, 0);
});

test("retries failed jobs up to maxAttempts before declaring failure", async () => {
  clearQueue();
  let attemptsCount = 0;

  registerJobHandler("GMAIL_SYNC", async () => {
    attemptsCount += 1;
    return { success: false, error: "Network timeout" };
  });

  enqueueJob({
    tenantId: "tenant-101",
    type: "GMAIL_SYNC",
    payload: { mailbox: "user@test.com" },
    maxAttempts: 2,
  });

  // First attempt (fails -> re-enqueued)
  const res1 = await processNextJob();
  assert.equal(res1.status, "pending");
  assert.equal(attemptsCount, 1);

  // Second attempt (fails -> max attempts reached -> status = failed)
  const res2 = await processNextJob();
  assert.equal(res2.status, "failed");
  assert.equal(attemptsCount, 2);
  assert.equal(res2.error, "Network timeout");
});
