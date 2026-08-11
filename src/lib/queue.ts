import { logInfo, logWarn, logError } from "./logger";

export type JobType =
  | "FORM_WEBHOOK_INGESTION"
  | "GMAIL_SYNC"
  | "AI_SUMMARY_GENERATION"
  | "EMBEDDING_BACKFILL";

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed" | "dead_letter";

export type QueueJob<T = Record<string, unknown>> = {
  id: string;
  tenantId: string;
  requestId?: string;
  type: JobType;
  payload: T;
  attempts: number;
  maxAttempts: number;
  status: QueueJobStatus;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
};

type JobHandler<T = Record<string, unknown>> = (
  job: QueueJob<T>
) => Promise<{ success: boolean; error?: string }>;

const jobHandlers = new Map<JobType, JobHandler<any>>();
const inMemoryQueue: QueueJob[] = [];
const deadLetterQueue: QueueJob[] = [];

/**
 * Registers a handler function for a specific background job type.
 */
export function registerJobHandler<T = Record<string, unknown>>(
  type: JobType,
  handler: JobHandler<T>
) {
  jobHandlers.set(type, handler as JobHandler);
}

/**
 * Enqueues a new background job into the event queue with optional request correlation ID.
 */
export function enqueueJob<T = Record<string, unknown>>(params: {
  tenantId: string;
  type: JobType;
  payload: T;
  requestId?: string;
  maxAttempts?: number;
}): QueueJob<T> {
  const job: QueueJob<T> = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    tenantId: params.tenantId,
    requestId: params.requestId,
    type: params.type,
    payload: params.payload,
    attempts: 0,
    maxAttempts: params.maxAttempts ?? 3,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryQueue.push(job as QueueJob);

  logInfo(`Enqueued job [${job.type}] with ID: ${job.id}`, {
    jobId: job.id,
    tenantId: job.tenantId,
    requestId: job.requestId,
    jobType: job.type,
  });

  return job;
}

/**
 * Returns pending jobs in the queue.
 */
export function getPendingJobs(): QueueJob[] {
  return inMemoryQueue.filter((j) => j.status === "pending");
}

/**
 * Returns dead-lettered jobs stored in the Dead Letter Queue (DLQ).
 */
export function getDeadLetterJobs(tenantId?: string): QueueJob[] {
  if (!tenantId) {
    return [...deadLetterQueue];
  }
  return deadLetterQueue.filter((j) => j.tenantId === tenantId);
}

/**
 * Retries a dead-lettered job by resetting its attempts and moving it back to the active queue.
 */
export function retryDeadLetterJob(jobId: string): {
  success: boolean;
  job?: QueueJob;
  error?: string;
} {
  const index = deadLetterQueue.findIndex((j) => j.id === jobId);
  if (index === -1) {
    return { success: false, error: `Job with ID '${jobId}' not found in Dead Letter Queue` };
  }

  const [job] = deadLetterQueue.splice(index, 1);
  job.status = "pending";
  job.attempts = 0;
  job.lastError = undefined;
  job.updatedAt = new Date();

  inMemoryQueue.push(job);

  logInfo(`Re-queued job [${job.id}] from Dead Letter Queue (DLQ)`, {
    jobId: job.id,
    tenantId: job.tenantId,
    requestId: job.requestId,
  });

  return { success: true, job };
}

function handleJobFailure(job: QueueJob, errorMsg: string): void {
  job.lastError = errorMsg;
  job.updatedAt = new Date();

  if (job.attempts < job.maxAttempts) {
    job.status = "pending"; // Re-enqueue for retry
    logWarn(`Job [${job.type}] failed attempt ${job.attempts}/${job.maxAttempts}, re-queued`, {
      jobId: job.id,
      tenantId: job.tenantId,
      requestId: job.requestId,
      error: job.lastError,
    });
  } else {
    // Route job to Dead Letter Queue (DLQ)
    job.status = "dead_letter";
    deadLetterQueue.push(job);

    logError(`Job [${job.type}] routed to Dead Letter Queue (DLQ)`, new Error(job.lastError), {
      jobId: job.id,
      tenantId: job.tenantId,
      requestId: job.requestId,
      payload: job.payload,
    });
  }
}

/**
 * Processes the next pending job in the queue using registered handlers.
 */
export async function processNextJob(): Promise<{
  processed: boolean;
  jobId?: string;
  status?: QueueJob["status"];
  error?: string;
}> {
  const jobIndex = inMemoryQueue.findIndex((j) => j.status === "pending");
  if (jobIndex === -1) {
    return { processed: false };
  }

  const job = inMemoryQueue[jobIndex];
  const handler = jobHandlers.get(job.type);

  if (!handler) {
    handleJobFailure(job, `No handler registered for job type: ${job.type}`);
    return { processed: true, jobId: job.id, status: job.status, error: job.lastError };
  }

  job.status = "processing";
  job.attempts += 1;
  job.updatedAt = new Date();

  logInfo(`Processing job [${job.type}] attempt ${job.attempts}/${job.maxAttempts}`, {
    jobId: job.id,
    tenantId: job.tenantId,
    requestId: job.requestId,
    attempts: job.attempts,
  });

  try {
    const result = await handler(job);
    if (result.success) {
      job.status = "completed";
      job.updatedAt = new Date();

      logInfo(`Job [${job.type}] completed successfully`, {
        jobId: job.id,
        tenantId: job.tenantId,
        requestId: job.requestId,
      });

      return { processed: true, jobId: job.id, status: "completed" };
    }

    handleJobFailure(job, result.error ?? "Job execution failed");
    return { processed: true, jobId: job.id, status: job.status, error: job.lastError };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unhandled queue error";
    handleJobFailure(job, errMessage);
    return { processed: true, jobId: job.id, status: job.status, error: errMessage };
  }
}

/**
 * Clears queue items for testing and resetting memory state.
 */
export function clearQueue() {
  inMemoryQueue.length = 0;
  deadLetterQueue.length = 0;
  jobHandlers.clear();
}
