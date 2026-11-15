CREATE TABLE "PublicDemo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicDemo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PublicDemo_tenantId_key" ON "PublicDemo"("tenantId");
CREATE UNIQUE INDEX "PublicDemo_userId_key" ON "PublicDemo"("userId");
CREATE INDEX "PublicDemo_expiresAt_idx" ON "PublicDemo"("expiresAt");
CREATE INDEX "PublicDemo_clientHash_createdAt_idx" ON "PublicDemo"("clientHash", "createdAt");
ALTER TABLE "PublicDemo" ADD CONSTRAINT "PublicDemo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicDemo" ADD CONSTRAINT "PublicDemo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
