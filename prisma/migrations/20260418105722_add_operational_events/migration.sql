-- CreateTable
CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalEvent_tenantId_createdAt_idx"
ON "OperationalEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_tenantId_source_createdAt_idx"
ON "OperationalEvent"("tenantId", "source", "createdAt");

-- AddForeignKey
ALTER TABLE "OperationalEvent"
ADD CONSTRAINT "OperationalEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
