import { describe, expect, it } from "vitest";
import { resolveLink } from "./resolveLink.js";

describe("resolveLink", () => {
  const sourceUrl = "https://en.wikipedia.org/wiki/Main_Page";

  it("resolves relative links", () => {
    expect(resolveLink("/wiki/Cat", sourceUrl)).toBe(
      "https://en.wikipedia.org/wiki/Cat",
    );
  });

  it("resolves protocol-relative links", () => {
    expect(
      resolveLink("//example.com/article", sourceUrl),
    ).toBe("https://example.com/article");
  });

  it("removes fragments after resolving", () => {
    expect(resolveLink("#bodyContent", sourceUrl)).toBe(
      "https://en.wikipedia.org/wiki/Main_Page",
    );
  });

  it("accepts HTTP links", () => {
    expect(resolveLink("http://example.com/page", sourceUrl)).toBe(
      "http://example.com/page",
    );
  });

  it("rejects non-HTTP protocols", () => {
    expect(resolveLink("mailto:someone@example.com", sourceUrl)).toBeNull();
  });
});