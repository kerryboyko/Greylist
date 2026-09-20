import { normalizeUrl } from "@greylist/shared";

export function resolveLink(
  href: string,
  sourceUrl: string,
): string | null {
  const url = new URL(href, sourceUrl);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  return normalizeUrl(url.toString());
}