/*
  Warnings:

  - The values [COMPLETED] on the enum `CrawlJobStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum

BEGIN;

UPDATE "CrawlJob"
SET
  "status" = 'PENDING',
  "reason" = 'RECRAWL',
  "scheduledAt" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '30 days',
  "startedAt" = NULL,
  "finishedAt" = NULL
WHERE "status" = 'COMPLETED';

CREATE TYPE "CrawlJobStatus_new"
  AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'CANCELLED');

ALTER TABLE "public"."CrawlJob"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "CrawlJob"
  ALTER COLUMN "status"
  TYPE "CrawlJobStatus_new"
  USING ("status"::text::"CrawlJobStatus_new");

ALTER TYPE "CrawlJobStatus"
  RENAME TO "CrawlJobStatus_old";

ALTER TYPE "CrawlJobStatus_new"
  RENAME TO "CrawlJobStatus";

DROP TYPE "public"."CrawlJobStatus_old";

ALTER TABLE "CrawlJob"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

COMMIT;