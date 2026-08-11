import assert from "node:assert/strict";
import { test } from "node:test";
import {
  enqueueJob,
  getPendingJobs,
  getDeadLetterJobs,
  retryDeadLetterJob,
  processNextJob,
  registerJobHandler,
  clearQueue,
} from "../src/lib/queue";

test("Routes failing background job to Dead Letter Queue (DLQ) after max retries", async () => {
  clearQueue();

  // Register a failing job handler
  registerJobHandler("GMAIL_SYNC", async () => {
    return { success: false, error: "Authentication failed repeatedly" };
  });

  const job = enqueueJob({
    tenantId: "tenant-dlq-test",
    type: "GMAIL_SYNC",
    payload: { mailbox: "test@example.com" },
    maxAttempts: 2,
    requestId: "req-dlq-001",
  });

  assert.equal(job.status, "pending");

  // Attempt 1
  const res1 = await processNextJob();
  assert.equal(res1.processed, true);
  assert.equal(res1.status, "pending");

  // Attempt 2 (Exceeds maxAttempts: 2) -> Should route to Dead Letter Queue
  const res2 = await processNextJob();
  assert.equal(res2.processed, true);
  assert.equal(res2.status, "dead_letter");

  // Verify pending queue is empty and DLQ contains the job
  const pending = getPendingJobs();
  assert.equal(pending.length, 0);

  const dlqJobs = getDeadLetterJobs("tenant-dlq-test");
  assert.equal(dlqJobs.length, 1);
  assert.equal(dlqJobs[0].id, job.id);
  assert.equal(dlqJobs[0].status, "dead_letter");
  assert.equal(dlqJobs[0].lastError, "Authentication failed repeatedly");
});

test("Allows retrying a dead-lettered job from Dead Letter Queue", async () => {
  clearQueue();

  let attemptCounter = 0;
  registerJobHandler("FORM_WEBHOOK_INGESTION", async () => {
    attemptCounter += 1;
    if (attemptCounter === 1) {
      return { success: false, error: "Database offline" };
    }
    return { success: true };
  });

  const job = enqueueJob({
    tenantId: "tenant-dlq-test-2",
    type: "FORM_WEBHOOK_INGESTION",
    payload: { formId: "form-123" },
    maxAttempts: 1, // Will fail on 1st attempt
    requestId: "req-dlq-002",
  });

  // Process attempt 1 -> Routes to DLQ
  await processNextJob();
  const dlqBefore = getDeadLetterJobs("tenant-dlq-test-2");
  assert.equal(dlqBefore.length, 1);

  // Retry from DLQ
  const retryRes = retryDeadLetterJob(job.id);
  assert.equal(retryRes.success, true);
  assert.equal(retryRes.job?.status, "pending");

  // DLQ should now be empty
  const dlqAfter = getDeadLetterJobs("tenant-dlq-test-2");
  assert.equal(dlqAfter.length, 0);

  // Process re-queued job -> Should succeed on 2nd attempt
  const processRes = await processNextJob();
  assert.equal(processRes.processed, true);
  assert.equal(processRes.status, "completed");
});
