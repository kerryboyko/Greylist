import type { Prisma } from "@greylist/database";

export async function enqueuePrimaryLinks(
  tx: Prisma.TransactionClient,
  urls: string[],
  discoveredFromPageId: bigint,
): Promise<void> {
  /* for each URL:
    if CrawlJob exists:
        leave it alone

    otherwise:
        create CrawlJob
        reason = PRIMARY
        discoveredFromPageId = current page
        */

  for (const url of urls) {
    await tx.crawlJob.upsert({
      where: {
        url,
      },
      create: {
        url,
        reason: "PRIMARY",
        discoveredFromPageId,
      },
      update: {},
    });
  }
}
