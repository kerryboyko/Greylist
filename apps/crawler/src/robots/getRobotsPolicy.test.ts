import { afterEach, describe, expect, it, vi } from "vitest";

import { CrawlPermission, RobotsPolicyResult } from "../constants.js";
import { getRobotsPolicy, isCrawlAllowed } from "./getRobotsPolicy.js";

describe("getRobotsPolicy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delays crawling when robots.txt returns 503", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    const result = await getRobotsPolicy("https://example.com/some/page");

    expect(result).toEqual({
      policy: RobotsPolicyResult.DELAY_CRAWL,
    });
  });
  it.each([
    [404, RobotsPolicyResult.NO_POLICY],
    [410, RobotsPolicyResult.NO_POLICY],
    [401, RobotsPolicyResult.DO_NOT_CRAWL],
    [403, RobotsPolicyResult.DO_NOT_CRAWL],
    [429, RobotsPolicyResult.DELAY_CRAWL],
    [500, RobotsPolicyResult.DELAY_CRAWL],
    [503, RobotsPolicyResult.DELAY_CRAWL],
  ])(
    "returns %s policy for robots.txt HTTP %i",
    async (status, expectedPolicy) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status }),
      );

      const result = await getRobotsPolicy("https://example.com/some/page");

      expect(result).toEqual({
        policy: expectedPolicy,
      });
    },
  );
  it("delays crawling when robots.txt cannot be fetched", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("fetch failed"),
    );

    const result = await getRobotsPolicy("https://example.com/some/page");

    expect(result).toEqual({
      policy: RobotsPolicyResult.DELAY_CRAWL,
    });
  });
  it("parses robots.txt when the server returns 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
        User-agent: *
        Disallow: /private
        `,
        { status: 200 },
      ),
    );

    const result = await getRobotsPolicy("https://example.com/some/page");

    expect(result.policy).toBe(RobotsPolicyResult.PARSE);
    expect(result.robot).toBeDefined();
  });
  it("denies a URL disallowed by robots.txt", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
        User-agent: *
        Disallow: /private
        `,
        { status: 200 },
      ),
    );

    const result = await isCrawlAllowed("https://example.com/private/secrets");

    expect(result).toBe(CrawlPermission.DENY);
  });
  it("allows a URL not disallowed by robots.txt", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
        User-agent: *
        Disallow: /private
        `,
        { status: 200 },
      ),
    );

    const result = await isCrawlAllowed("https://example.com/public/page");

    expect(result).toBe(CrawlPermission.ALLOW);
  });
  it("allows crawling when no robots policy exists", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 404 }),
    );

    const result = await isCrawlAllowed("https://example.com/some/page");

    expect(result).toBe(CrawlPermission.ALLOW);
  });

  it.each([429, 500, 503])(
    "delays crawling when robots.txt returns HTTP %i",
    async (status) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status }),
      );

      const result = await isCrawlAllowed("https://example.com/some/page");

      expect(result).toBe(CrawlPermission.DELAY);
    },
  );
});
