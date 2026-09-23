-- CreateTable
CREATE TABLE "CrawlHost" (
    "hostname" TEXT NOT NULL,
    "nextRequestAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlHost_pkey" PRIMARY KEY ("hostname")
);
