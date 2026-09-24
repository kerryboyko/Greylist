-- AlterTable
ALTER TABLE "CrawlHost" ADD COLUMN     "robotsExpiresAt" TIMESTAMP(3),
ADD COLUMN     "robotsFetchedAt" TIMESTAMP(3),
ADD COLUMN     "robotsStatus" INTEGER,
ADD COLUMN     "robotsTxt" TEXT;
