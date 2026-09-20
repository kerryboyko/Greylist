import { describe, expect, it } from "vitest";
import { isWikipediaArticle } from "./isWikipediaArticle.js";

describe("isWikipediaArticle", () => {
  it("accepts an encyclopedia article", () => {
    expect(
      isWikipediaArticle("https://en.wikipedia.org/wiki/Ada_Lovelace"),
    ).toBe(true);
  });

  it("rejects another domain", () => {
    expect(isWikipediaArticle("https://example.com/wiki/Ada_Lovelace")).toBe(
      false,
    );
  });

  it("rejects URLs outside /wiki/", () => {
    expect(isWikipediaArticle("https://en.wikipedia.org/w/index.php")).toBe(
      false,
    );
  });

  it("rejects Wikipedia namespace pages", () => {
    expect(
      isWikipediaArticle("https://en.wikipedia.org/wiki/Wikipedia:About"),
    ).toBe(false);
  });

  it("rejects Help namespace pages", () => {
    expect(
      isWikipediaArticle("https://en.wikipedia.org/wiki/Help:Contents"),
    ).toBe(false);
  });

  it("rejects Special namespace pages", () => {
    expect(
      isWikipediaArticle("https://en.wikipedia.org/wiki/Special:Random"),
    ).toBe(false);
  });

  it("rejects percent-encoded namespace separators", () => {
    expect(
      isWikipediaArticle("https://en.wikipedia.org/wiki/Help%3AContents"),
    ).toBe(false);
  });

  it("allows colons in ordinary article titles", () => {
    expect(
      isWikipediaArticle("https://en.wikipedia.org/wiki/Star_Trek:_Voyager"),
    ).toBe(true);
  });
});
