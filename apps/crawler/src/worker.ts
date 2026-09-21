import { createHash } from "node:crypto";
import { prisma } from "@greylist/database";
import { claimCrawlJob } from "./queue/claimCrawlJob.js";

import * as cheerio from "cheerio";
import { resolveLink } from "./links/resolveLink.js";
import { isWikipediaArticle } from "./policy/isWikipediaArticle.js";

/* TODO: This is a refactor target. */

interface ParsedLink {
  url: string;
  anchorTexts: string[];
}

interface ParsedWikipediaResponse {
  title: string;
  canonicalUrl: string | null;
  content: string;
  contentHash: string;
  links: ParsedLink[];
}

export async function parseWikipediaResponse(
  response: Response,
  jobUrl: string,
): Promise<ParsedWikipediaResponse> {
  const html = await response.text();
  const $ = cheerio.load(html);
  const title = $("title").text();
  const canonicalUrl = $("link[rel='canonical']").attr("href") ?? null;

  const article = $(".mw-parser-output").clone();

  // .remove() returns the removed elements, so keep the original
  // article selection and mutate it separately.
  article.find("style, script, noscript").remove();

  const content = article.text().replace(/\s+/g, " ").trim();

  const contentHash = createHash("sha256").update(content).digest("hex");

  const linksByUrl = new Map<string, Set<string>>();

  article.find("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const url = resolveLink(href, jobUrl);

    if (!url || !isWikipediaArticle(url)) {
      return;
    }

    const anchorText = $(element).text().replace(/\s+/g, " ").trim();

    let anchorTexts = linksByUrl.get(url);

    if (!anchorTexts) {
      anchorTexts = new Set<string>();
      linksByUrl.set(url, anchorTexts);
    }

    if (anchorText) {
      anchorTexts.add(anchorText);
    }
  });

  const links: ParsedLink[] = [...linksByUrl.entries()].map(
    ([url, anchorTexts]) => ({
      url,
      anchorTexts: [...anchorTexts],
    }),
  );

  return {
    title,
    canonicalUrl,
    content,
    contentHash,
    links,
  };
}

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
    console.info(`Status: ${response.status}`);
    console.info(`Content-Type: ${response.headers.get("content-type")}`);
    console.info(`Found ${links.length} resolved links`);

    for (const [i, link] of links.slice(0, 10).entries()) {
      console.info(`  ${i} - ${link.url}`);
      console.info(`      ${JSON.stringify(link.anchorTexts)}`);
    }

    console.info(`Content hash: ${contentHash}`);
    console.info(`Extracted ${content.length} characters of article content`);
    console.info(content.slice(0, 500));
    console.info(`Title: ${title} | Canonical URL: ${canonicalUrl}`);
    // END diagnostic block;

    const pageUrl = new URL(job.url);
    const fetchedAt = new Date();

    const page = await prisma.page.upsert({
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

    // no Promise.all() yet.
    // on a recrawl, if a link has disappeared from the page,
    // these upserts won't delete its old Link row.
    const linksObservedAt = new Date();

    for (const link of links) {
      await prisma.link.upsert({
        where: {
          fromPageId_toUrl: {
            fromPageId: page.id,
            toUrl: link.url,
          },
        },
        create: {
          fromPageId: page.id,
          toUrl: link.url,
          anchorTexts: link.anchorTexts,
          firstSeenAt: linksObservedAt,
          lastSeenAt: linksObservedAt,
          isPresent: true,
        },
        update: {
          anchorTexts: link.anchorTexts,
          lastSeenAt: linksObservedAt,
          isPresent: true,
        },
      });
    }
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

main();
