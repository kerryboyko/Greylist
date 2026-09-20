import * as cheerio from "cheerio";
import { normalizeUrl } from "@greylist/shared";
import { resolveLink } from "./links/resolveLink.js";

import { isWikipediaArticle } from "./policy/isWikipediaArticle.js";

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

console.info(eligibleLinks);