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
  if (urls.length === 0) {
    return;
  }

  await tx.crawlJob.createMany({
    data: urls.map((url) => ({
      url,
      reason: "PRIMARY",
      discoveredFromPageId,
    })),
    skipDuplicates: true,
  });
}
