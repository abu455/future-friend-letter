-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW', 'QUALIFY', 'TO_CONTACT', 'CONTACTED', 'NEED_CONFIRMED', 'SOLUTION', 'NEGOTIATION', 'SIGNING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "SignalLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demoMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paused',
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastScannedAt" TIMESTAMP(3),
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "usageCurrent" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "industry" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keywords" TEXT[],
    "intensity" INTEGER NOT NULL,
    "urgency" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "SignalLevel" NOT NULL,
    "recommendation" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "employeeRange" TEXT,
    "description" TEXT,
    "technologies" TEXT[],
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seniority" TEXT,
    "location" TEXT,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "needsEnrichment" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "sourceSignalId" TEXT,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "estimatedAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "probability" INTEGER NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW',
    "nextAction" TEXT,
    "expectedCloseDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "riskTags" TEXT[],
    "lossReason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityContact" (
    "opportunityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityContact_pkey" PRIMARY KEY ("opportunityId","contactId")
);

-- CreateTable
CREATE TABLE "OpportunityStageHistory" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "type" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "model" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "confidence" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "marketSignalId" TEXT,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "rawContent" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "DataSource_workspaceId_type_idx" ON "DataSource"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "MarketSignal_workspaceId_level_score_idx" ON "MarketSignal"("workspaceId", "level", "score");

-- CreateIndex
CREATE INDEX "MarketSignal_industry_region_idx" ON "MarketSignal"("industry", "region");

-- CreateIndex
CREATE INDEX "Company_workspaceId_industry_region_idx" ON "Company"("workspaceId", "industry", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Company_workspaceId_name_key" ON "Company"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_companyId_idx" ON "Contact"("workspaceId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_idempotencyKey_key" ON "Opportunity"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Opportunity_workspaceId_stage_score_idx" ON "Opportunity"("workspaceId", "stage", "score");

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_opportunityId_createdAt_idx" ON "OpportunityStageHistory"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_opportunityId_createdAt_idx" ON "Activity"("opportunityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpTask_idempotencyKey_key" ON "FollowUpTask"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FollowUpTask_workspaceId_status_dueAt_idx" ON "FollowUpTask"("workspaceId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRun_idempotencyKey_key" ON "AgentRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentRun_workspaceId_type_createdAt_idx" ON "AgentRun"("workspaceId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AgentMessage_runId_createdAt_idx" ON "AgentMessage"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageTemplate_workspaceId_channel_language_idx" ON "MessageTemplate"("workspaceId", "channel", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ScanJob_idempotencyKey_key" ON "ScanJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScanJob_workspaceId_status_createdAt_idx" ON "ScanJob"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SourceRecord_workspaceId_fetchedAt_idx" ON "SourceRecord"("workspaceId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRecord_dataSourceId_externalId_key" ON "SourceRecord"("dataSourceId", "externalId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSignal" ADD CONSTRAINT "MarketSignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSignal" ADD CONSTRAINT "MarketSignal_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSignal" ADD CONSTRAINT "MarketSignal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sourceSignalId_fkey" FOREIGN KEY ("sourceSignalId") REFERENCES "MarketSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContact" ADD CONSTRAINT "OpportunityContact_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContact" ADD CONSTRAINT "OpportunityContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_marketSignalId_fkey" FOREIGN KEY ("marketSignalId") REFERENCES "MarketSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
