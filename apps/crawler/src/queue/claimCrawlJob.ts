import { prisma } from "@greylist/database";
import { CRAWLER_JOB_TIMEOUT_MS } from "../config.js";

export async function claimCrawlJob() {
// Prisma does not currently expose PostgreSQL's FOR UPDATE SKIP LOCKED.
// We use a raw query here so multiple crawler workers can atomically claim
// different eligible jobs without blocking or claiming the same job.
//
// PENDING jobs are eligible once scheduledAt has passed.
// RUNNING jobs are eligible for recovery once their worker lease has expired.
// Normal pending work takes precedence over stale-job recovery.
  const jobs = await prisma.$queryRaw<
    Array<{
      id: bigint;
      url: string;
    }>
  >`
    UPDATE "CrawlJob"
    SET
      "status" = 'RUNNING',
      "startedAt" = NOW() AT TIME ZONE 'UTC',
      "updatedAt" = NOW() AT TIME ZONE 'UTC'
    WHERE "id" = (
      SELECT "id"
      FROM "CrawlJob"
      WHERE (
        (
          "status" = 'PENDING'
          AND "scheduledAt" <= NOW() AT TIME ZONE 'UTC'
        )
        OR
        (
          "status" = 'RUNNING'
          AND "startedAt" <=
            (NOW() AT TIME ZONE 'UTC')
            - (${CRAWLER_JOB_TIMEOUT_MS} * INTERVAL '1 millisecond')
        )
      )
      ORDER BY
        "priority" DESC,
        CASE WHEN "status" = 'PENDING' THEN 0 ELSE 1 END,
        "scheduledAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "url";
  `;

  return jobs[0] ?? null;
}
