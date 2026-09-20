import * as cheerio from "cheerio";
import { prisma } from "@greylist/database";
import { resolveLink } from "./links/resolveLink.js";
import { isWikipediaArticle } from "./policy/isWikipediaArticle.js";
import { claimCrawlJob } from "./queue/claimCrawlJob.js";

async function enqueueLink(eligibleLink: string): Promise<"ok" | "err"> {
  try {
    const crawlJob = await prisma.crawlJob.upsert({
      where: {
        url: eligibleLink,
      },
      update: {},
      create: {
        url: eligibleLink,
        reason: "PRIMARY",
      },
    });

    console.info(`Crawl job ${crawlJob.id} for ${crawlJob.url}`);
    return "ok";
  } catch (e) {
    console.error(e);
    return "err";
  }
}

async function main(): Promise<void> {
  const sourceCount = await prisma.sourcePolicy.count();

  console.info(`Source policies: ${sourceCount}`);

  const url = "https://en.wikipedia.org/wiki/Main_Page";

  console.info(`Fetching ${url}`);

  const response = await fetch(url);

  console.info(`Status: ${response.status}`);
  console.info(`Content-Type: ${response.headers.get("content-type")}`);

  const html = await response.text();

  console.info(`Received ${html.length} characters`);

  const $ = cheerio.load(html);

  console.info(`Title: ${$("title").text()}`);

  const canonicalUrl = $("link[rel='canonical']").attr("href");

  console.info(`Canonical URL: ${canonicalUrl}`);

  const links = $("a[href]")
    .map((_, element) => $(element).attr("href"))
    .get();
  console.info(`Found ${links.length} links`);

  const resolvedLinks = links
    .map((href) => resolveLink(href, url))
    .filter((link): link is string => link !== null);

  const uniqueLinks = [...new Set(resolvedLinks)];

  console.info(`Resolved ${resolvedLinks.length} HTTP(S) links`);
  console.info(`Unique: ${uniqueLinks.length}`);

  const eligibleLinks = uniqueLinks.filter(isWikipediaArticle);

  console.info(`Eligible Wikipedia articles: ${eligibleLinks.length}`);

  for (const eligibleLink of eligibleLinks) {
    // no Promise.all([]) concurrency for now.
    const linkCrawlStatus = await enqueueLink(eligibleLink);

    console.info(`Link Crawl Status '${linkCrawlStatus}'`);
  }

  const claimedJob = await claimCrawlJob();

  console.info("Claimed job:", claimedJob);
}

main();
