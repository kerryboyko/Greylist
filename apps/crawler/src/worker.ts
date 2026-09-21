import { prisma } from "@greylist/database";
import { claimCrawlJob } from "./queue/claimCrawlJob.js";
import { parseWikipediaResponse } from "./parsers/wikipediaParser.js";

async function main(): Promise<void> {
  const job = await claimCrawlJob();
  if (!job) {
    console.info(`No crawl jobs available`);
    return;
  }

  const attempt = await prisma.crawlAttempt.create({
    data: {
      jobId: job.id,
      url: job.url,
    },
  });
  console.info(
    `Started crawl attempt ${attempt.id} for ${job.url} and job ${job.id}`,
  );

  try {
    const response = await fetch(job.url);

    const { title, canonicalUrl, content, contentHash, links } =
      await parseWikipediaResponse(response, job.url);

    // BEGIN diagnostic block;
    // console.info(`Status: ${response.status}`);
    // console.info(`Content-Type: ${response.headers.get("content-type")}`);
    // console.info(`Found ${links.length} resolved links`);

    // for (const [i, link] of links.slice(0, 10).entries()) {
    //   console.info(`  ${i} - ${link.url}`);
    //   console.info(`      ${JSON.stringify(link.anchorTexts)}`);
    // }

    // console.info(`Content hash: ${contentHash}`);
    // console.info(`Extracted ${content.length} characters of article content`);
    // console.info(content.slice(0, 500));
    console.info(`Title: ${title} | Canonical URL: ${canonicalUrl}`);
    // END diagnostic block;

    const pageUrl = new URL(job.url);
    const fetchedAt = new Date();
    const page = await prisma.$transaction(async (tx) => {
      const observedUrls = links.map((link) => link.url);

      // Store the latest successfully fetched snapshot of this page.
      const pageUpsert = await tx.page.upsert({
        where: {
          url: job.url,
        },
        create: {
          url: job.url,
          canonicalUrl,
          domain: pageUrl.hostname,
          title,
          content,
          contentHash,
          httpStatus: response.status,
          fetchedAt,
        },
        update: {
          canonicalUrl,
          title,
          content,
          contentHash,
          httpStatus: response.status,
          fetchedAt,
        },
      });

      // Resolve previously discovered links pointing to this page.
      //
      // A link may have been discovered before its target Page was crawled,
      // leaving toPageId null. Now that this Page exists, connect those edges.
      await tx.link.updateMany({
        where: {
          toUrl: pageUpsert.url,
          toPageId: null,
        },
        data: {
          toPageId: pageUpsert.id,
        },
      });

      // Find which outgoing link targets already exist as Pages.
      //
      // Doing this once lets us resolve outgoing edges without querying the
      // Page table separately for every link.
      const targetPages = await tx.page.findMany({
        where: {
          url: {
            in: observedUrls,
          },
        },
        select: {
          id: true,
          url: true,
        },
      });

      const targetPageIds = new Map(
        targetPages.map((page) => [page.url, page.id]),
      );

      // no Promise.all() yet.
      // Store every link observed in this crawl.
      //
      // Existing edges preserve firstSeenAt while updating their latest
      // observation. If the target Page already exists, connect it immediately.
      for (const link of links) {
        const toPageId = targetPageIds.get(link.url) ?? null;
        await tx.link.upsert({
          where: {
            fromPageId_toUrl: {
              fromPageId: pageUpsert.id,
              toUrl: link.url,
            },
          },
          create: {
            fromPageId: pageUpsert.id,
            toPageId,
            toUrl: link.url,
            anchorTexts: link.anchorTexts,
            firstSeenAt: fetchedAt,
            lastSeenAt: fetchedAt,
            isPresent: true,
          },
          update: {
            toPageId,
            anchorTexts: link.anchorTexts,
            lastSeenAt: fetchedAt,
            isPresent: true,
          },
        });
      }

      // Any previously present edge that was not observed in this successful
      // crawl has disappeared.
      //
      // Preserve lastSeenAt: it records the last time the edge actually existed.
      await tx.link.updateMany({
        where: {
          fromPageId: pageUpsert.id,
          isPresent: true,
          toUrl: {
            notIn: observedUrls,
          },
        },
        data: {
          isPresent: false,
        },
      });
      return pageUpsert;
    });

    const finishedAt = new Date();

    await prisma.crawlAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        httpStatus: response.status,
        contentType: response.headers.get("content-type"),
        finishedAt,
        pageId: page.id,
      },
    });

    console.info(`Stored page ${page.id} for ${page.url}`);

    await prisma.crawlJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "COMPLETED",
        finishedAt,
      },
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    const erroredAt = new Date();

    await prisma.crawlAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        error,
        finishedAt: erroredAt,
      },
    });

    await prisma.crawlJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "FAILED",
        finishedAt: erroredAt,
      },
    });

    console.error(`Crawl failed for ${job.url}: ${error}`);
  }
}

console.time("Total Worker Execution Time");
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.timeEnd("Total Worker Execution Time");
  });
