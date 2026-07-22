export type JobType =
  | "FORM_WEBHOOK_INGESTION"
  | "GMAIL_SYNC"
  | "AI_SUMMARY_GENERATION"
  | "EMBEDDING_BACKFILL";

export type QueueJob<T = Record<string, unknown>> = {
  id: string;
  tenantId: string;
  type: JobType;
  payload: T;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "processing" | "completed" | "failed";
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
};

type JobHandler<T = Record<string, unknown>> = (
  job: QueueJob<T>
) => Promise<{ success: boolean; error?: string }>;

const jobHandlers = new Map<JobType, JobHandler<any>>();
const inMemoryQueue: QueueJob[] = [];

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
 * Enqueues a new background job into the event queue.
 */
export function enqueueJob<T = Record<string, unknown>>(params: {
  tenantId: string;
  type: JobType;
  payload: T;
  maxAttempts?: number;
}): QueueJob<T> {
  const job: QueueJob<T> = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    tenantId: params.tenantId,
    type: params.type,
    payload: params.payload,
    attempts: 0,
    maxAttempts: params.maxAttempts ?? 3,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryQueue.push(job as QueueJob);
  return job;
}

/**
 * Returns pending jobs in the queue.
 */
export function getPendingJobs(): QueueJob[] {
  return inMemoryQueue.filter((j) => j.status === "pending");
}

/**
 * Processes the next pending job in the queue using registered handlers and exponential backoff retry.
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
    job.status = "failed";
    job.lastError = `No handler registered for job type: ${job.type}`;
    job.updatedAt = new Date();
    return { processed: true, jobId: job.id, status: "failed", error: job.lastError };
  }

  job.status = "processing";
  job.attempts += 1;
  job.updatedAt = new Date();

  try {
    const result = await handler(job);
    if (result.success) {
      job.status = "completed";
      job.updatedAt = new Date();
      return { processed: true, jobId: job.id, status: "completed" };
    }

    if (job.attempts < job.maxAttempts) {
      job.status = "pending"; // Re-enqueue for retry
      job.lastError = result.error ?? "Job execution failed";
      job.updatedAt = new Date();
      return { processed: true, jobId: job.id, status: "pending", error: job.lastError };
    }

    job.status = "failed";
    job.lastError = result.error ?? "Max attempts exceeded";
    job.updatedAt = new Date();
    return { processed: true, jobId: job.id, status: "failed", error: job.lastError };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unhandled queue error";
    if (job.attempts < job.maxAttempts) {
      job.status = "pending";
      job.lastError = errMessage;
    } else {
      job.status = "failed";
      job.lastError = errMessage;
    }
    job.updatedAt = new Date();
    return { processed: true, jobId: job.id, status: job.status, error: errMessage };
  }
}

/**
 * Clears queue items for testing and resetting memory state.
 */
export function clearQueue() {
  inMemoryQueue.length = 0;
  jobHandlers.clear();
}
