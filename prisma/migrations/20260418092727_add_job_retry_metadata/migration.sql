-- AlterTable
ALTER TABLE "MailboxConnection"
ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WebhookEvent"
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_status_nextRetryAt_receivedAt_idx"
ON "WebhookEvent"("tenantId", "status", "nextRetryAt", "receivedAt");
