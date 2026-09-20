import { prisma } from "@greylist/database";

export async function claimCrawlJob() {
  // Prisma does not currently expose PostgreSQL's FOR UPDATE SKIP LOCKED.
  // We use a raw query here so multiple crawler workers can atomically claim
  // different pending jobs without blocking or claiming the same job.
  const jobs = await prisma.$queryRaw<
    Array<{
      id: bigint;
      url: string;
    }>
  >`
    UPDATE "CrawlJob"
    SET
      "status" = 'RUNNING',
      "startedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id"
      FROM "CrawlJob"
      WHERE "status" = 'PENDING'
        AND "scheduledAt" <= NOW()
      ORDER BY "priority" DESC, "scheduledAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "url";
  `;

  return jobs[0] ?? null;
}
