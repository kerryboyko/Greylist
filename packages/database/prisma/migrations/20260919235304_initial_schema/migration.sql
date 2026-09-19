-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('PRIMARY', 'SUPPRESSED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "CrawlJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrawlReason" AS ENUM ('PRIMARY', 'CITED', 'RECRAWL');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcePolicy" (
    "id" BIGSERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "classification" "Classification" NOT NULL,
    "scopes" TEXT[],
    "expertise" TEXT[],
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" BIGINT,

    CONSTRAINT "SourcePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" BIGSERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "domain" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "httpStatus" INTEGER,
    "contentHash" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" BIGSERIAL NOT NULL,
    "fromPageId" BIGINT NOT NULL,
    "toPageId" BIGINT,
    "toUrl" TEXT NOT NULL,
    "anchorText" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" BIGSERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "reason" "CrawlReason" NOT NULL,
    "status" "CrawlJobStatus" NOT NULL DEFAULT 'PENDING',
    "discoveredFromPageId" BIGINT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlAttempt" (
    "id" BIGSERIAL NOT NULL,
    "jobId" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "pageId" BIGINT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "httpStatus" INTEGER,
    "error" TEXT,
    "contentType" TEXT,
    "bytes" INTEGER,
    "durationMs" INTEGER,

    CONSTRAINT "CrawlAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "SourcePolicy_domain_key" ON "SourcePolicy"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Page_url_key" ON "Page"("url");

-- CreateIndex
CREATE INDEX "Page_domain_idx" ON "Page"("domain");

-- CreateIndex
CREATE INDEX "Link_fromPageId_idx" ON "Link"("fromPageId");

-- CreateIndex
CREATE INDEX "Link_toPageId_idx" ON "Link"("toPageId");

-- CreateIndex
CREATE INDEX "Link_toUrl_idx" ON "Link"("toUrl");

-- CreateIndex
CREATE INDEX "CrawlJob_status_priority_scheduledAt_idx" ON "CrawlJob"("status", "priority", "scheduledAt");

-- CreateIndex
CREATE INDEX "CrawlJob_url_idx" ON "CrawlJob"("url");

-- CreateIndex
CREATE INDEX "CrawlAttempt_jobId_idx" ON "CrawlAttempt"("jobId");

-- CreateIndex
CREATE INDEX "CrawlAttempt_url_idx" ON "CrawlAttempt"("url");

-- CreateIndex
CREATE INDEX "CrawlAttempt_pageId_idx" ON "CrawlAttempt"("pageId");

-- CreateIndex
CREATE INDEX "CrawlAttempt_startedAt_idx" ON "CrawlAttempt"("startedAt");

-- AddForeignKey
ALTER TABLE "SourcePolicy" ADD CONSTRAINT "SourcePolicy_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_fromPageId_fkey" FOREIGN KEY ("fromPageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_toPageId_fkey" FOREIGN KEY ("toPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlJob" ADD CONSTRAINT "CrawlJob_discoveredFromPageId_fkey" FOREIGN KEY ("discoveredFromPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlAttempt" ADD CONSTRAINT "CrawlAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CrawlJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlAttempt" ADD CONSTRAINT "CrawlAttempt_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
