import { createHash } from "node:crypto";
import { prisma } from "@greylist/database";
import { claimCrawlJob } from "./queue/claimCrawlJob.js";

import * as cheerio from "cheerio";
import { resolveLink } from "./links/resolveLink.js";
import { isWikipediaArticle } from "./policy/isWikipediaArticle.js";

/* TODO: This is a refactor target. */

interface ParsedWikipediaResponse {
  title: string;
  canonicalUrl: string | null;
  content: string;
  contentHash: string;
  links: string[];
}

export async function parseWikipediaResponse(
  response: Response,
  jobUrl: string,
): Promise<ParsedWikipediaResponse> {
  const html = await response.text();
  const $ = cheerio.load(html);
  const title = $("title").text();
  const canonicalUrl = $("link[rel='canonical']").attr("href") ?? null;
  const content = $(".mw-parser-output")
    .clone()
    .find("style, script, noscript")
    .remove()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const contentHash = createHash("sha256").update(content).digest("hex");

  const links = [
    ...new Set(
      $("a[href]")
        .map((_, element) => $(element).attr("href"))
        .get()
        .map((href) => resolveLink(href, jobUrl))
        .filter((url): url is string => url !== null)
        .filter(isWikipediaArticle),
    ),
  ];

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
      console.info(`  ${i} - ${link}`);
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
