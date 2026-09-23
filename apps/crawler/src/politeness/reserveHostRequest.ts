import { prisma } from "@greylist/database";

import { CRAWLER_MIN_HOST_INTERVAL_MS } from "../config.js";

/* This will store the -NEXT- unreserved time in the
   database, rather than trying to store "last at" access
   and adding an arbitrary value. */

export async function reserveHostRequest(url: string): Promise<Date> {
  const hostname = new URL(url).hostname;

  // ensure the hostname exists.
  await prisma.crawlHost.upsert({
    where: {
      hostname,
    },
    create: {
      hostname,
      nextRequestAt: new Date(0),
    },
    update: {},
  });

  // atomically reserve a slot.
  const rows = await prisma.$queryRaw<Array<{ reservedAt: Date }>>`
  UPDATE "CrawlHost"
  SET
    "nextRequestAt" =
      GREATEST(
        "nextRequestAt",
        NOW() AT TIME ZONE 'UTC'
      ) + (${CRAWLER_MIN_HOST_INTERVAL_MS} * INTERVAL '1 millisecond'),
    "updatedAt" = NOW() AT TIME ZONE 'UTC'
  WHERE "hostname" = ${hostname}
  RETURNING
    "nextRequestAt"
      - (${CRAWLER_MIN_HOST_INTERVAL_MS} * INTERVAL '1 millisecond')
      AS "reservedAt"
`;

  const reservedAt = rows[0]?.reservedAt;

  if (!reservedAt) {
    throw new Error(`Failed to reserve request slot for ${hostname}`);
  }

  return reservedAt;
}
