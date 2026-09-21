import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { resolveLink } from "../links/resolveLink.js";
import { isWikipediaArticle } from "../policy/isWikipediaArticle.js";

export interface ParsedLink {
  url: string;
  anchorTexts: string[];
}

export interface ParsedWikipediaResponse {
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
  if (article.length === 0) {
    throw new Error("Wikipedia article content container not found");
  }

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