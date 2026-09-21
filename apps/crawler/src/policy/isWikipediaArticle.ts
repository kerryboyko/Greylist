import { EXCLUDED_WIKIPEDIA_NAMESPACES } from "./wikipediaNamespaces.js";

export function isWikipediaArticle(input: string): boolean {
  const url = new URL(input);

  if (url.hostname !== "en.wikipedia.org") {
    return false;
  }

  if (!url.pathname.startsWith("/wiki/")) {
    return false;
  }

  if (url.searchParams.has("redlink")) {
    return false;
  }

  const articleName = decodeURIComponent(url.pathname.slice("/wiki/".length));
  const namespace = articleName.split(":", 1)[0];

  if (namespace && EXCLUDED_WIKIPEDIA_NAMESPACES.has(namespace)) {
    return false;
  }

  return true;
}
