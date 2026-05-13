-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "WorkspaceInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('GMAIL');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL', 'FOLLOW_UP', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'FORM', 'EMAIL', 'REFERRAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AIGenerationType" AS ENUM ('TAGGING', 'SUMMARY', 'REPLY_SUGGESTION', 'FOLLOW_UP', 'SEARCH_ANSWER');

-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM ('LEAD_CREATED', 'LEAD_WORKFLOW_UPDATED', 'LEAD_INTELLIGENCE_UPDATED', 'NOTE_CREATED', 'OUTBOUND_MESSAGE_SAVED', 'MEMBER_INVITED', 'MEMBER_ROLE_UPDATED', 'INVITE_REVOKED', 'INVITE_ACCEPTED', 'AI_INSTRUCTIONS_UPDATED', 'GMAIL_CONNECTED', 'GMAIL_SYNCED', 'WEBHOOK_QUEUE_PROCESSED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aiInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "WorkspaceInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "summary" TEXT,
    "nextAction" TEXT,
    "score" INTEGER,
    "budgetStatus" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "leadId" TEXT,
    "subject" TEXT,
    "channel" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "externalMessageId" TEXT,
    "source" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTag" (
    "leadId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGeneration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "conversationId" TEXT,
    "requestedById" TEXT,
    "type" "AIGenerationType" NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT,
    "inputSummary" TEXT,
    "outputText" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageEmbedding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "vector" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteEmbedding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "vector" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditLogAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_tenantId_status_createdAt_idx" ON "WorkspaceInvite"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_tenantId_email_status_key" ON "WorkspaceInvite"("tenantId", "email", "status");

-- CreateIndex
CREATE INDEX "Contact_tenantId_company_idx" ON "Contact"("tenantId", "company");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenantId_email_key" ON "Contact"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Lead_tenantId_stage_idx" ON "Lead"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "Lead_tenantId_followUpAt_idx" ON "Lead"("tenantId", "followUpAt");

-- CreateIndex
CREATE INDEX "Lead_contactId_idx" ON "Lead"("contactId");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_lastMessageAt_idx" ON "Conversation"("tenantId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_externalMessageId_key" ON "Message"("externalMessageId");

-- CreateIndex
CREATE INDEX "Message_tenantId_createdAt_idx" ON "Message"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "MailboxConnection_tenantId_provider_updatedAt_idx" ON "MailboxConnection"("tenantId", "provider", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxConnection_tenantId_provider_email_key" ON "MailboxConnection"("tenantId", "provider", "email");

-- CreateIndex
CREATE INDEX "Note_tenantId_createdAt_idx" ON "Note"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_leadId_idx" ON "Note"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_tenantId_name_key" ON "Tag"("tenantId", "name");

-- CreateIndex
CREATE INDEX "LeadTag_tagId_idx" ON "LeadTag"("tagId");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_status_receivedAt_idx" ON "WebhookEvent"("tenantId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "AIGeneration_tenantId_type_createdAt_idx" ON "AIGeneration"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AIGeneration_leadId_idx" ON "AIGeneration"("leadId");

-- CreateIndex
CREATE INDEX "AIGeneration_conversationId_idx" ON "AIGeneration"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageEmbedding_messageId_key" ON "MessageEmbedding"("messageId");

-- CreateIndex
CREATE INDEX "MessageEmbedding_tenantId_updatedAt_idx" ON "MessageEmbedding"("tenantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NoteEmbedding_noteId_key" ON "NoteEmbedding"("noteId");

-- CreateIndex
CREATE INDEX "NoteEmbedding_tenantId_updatedAt_idx" ON "NoteEmbedding"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxConnection" ADD CONSTRAINT "MailboxConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTag" ADD CONSTRAINT "LeadTag_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTag" ADD CONSTRAINT "LeadTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEmbedding" ADD CONSTRAINT "MessageEmbedding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEmbedding" ADD CONSTRAINT "MessageEmbedding_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteEmbedding" ADD CONSTRAINT "NoteEmbedding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteEmbedding" ADD CONSTRAINT "NoteEmbedding_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
