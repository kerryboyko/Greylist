import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./normalizeUrl.js";

describe("normalizeUrl", () => {
  it("normalizes hostname casing", () => {
    expect(normalizeUrl("https://EXAMPLE.COM/foo"))
      .toBe("https://example.com/foo");
  });

  it("removes URL fragments", () => {
    expect(normalizeUrl("https://example.com/foo#section"))
      .toBe("https://example.com/foo");
  });

  it("removes default ports", () => {
    expect(normalizeUrl("https://example.com:443/foo"))
      .toBe("https://example.com/foo");
  });

  it("preserves non-default ports", () => {
    expect(normalizeUrl("https://example.com:8443/foo"))
      .toBe("https://example.com:8443/foo");
  });

  it("preserves query strings", () => {
    expect(normalizeUrl("https://example.com/foo?a=1&b=2"))
      .toBe("https://example.com/foo?a=1&b=2");
  });
});