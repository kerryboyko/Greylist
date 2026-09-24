import { config } from "dotenv";

config({
  path: new URL("../../../.env", import.meta.url),
});

if (!process.env.CRAWLER_USER_AGENT) {
  throw new Error("CRAWLER_USER_AGENT is not defined");
}

export const CRAWLER_USER_AGENT = process.env.CRAWLER_USER_AGENT;

const crawlerMinHostIntervalMs = Number(
  process.env.CRAWLER_MIN_HOST_INTERVAL_MS,
);

if (
  !Number.isInteger(crawlerMinHostIntervalMs) ||
  crawlerMinHostIntervalMs < 0
) {
  throw new Error(
    "CRAWLER_MIN_HOST_INTERVAL_MS must be a non-negative integer",
  );
}

export const CRAWLER_MIN_HOST_INTERVAL_MS = crawlerMinHostIntervalMs;

const crawlerRobotsCacheTtlMs = Number(process.env.CRAWLER_ROBOTS_CACHE_TTL_MS);

if (!Number.isInteger(crawlerRobotsCacheTtlMs) || crawlerRobotsCacheTtlMs < 0) {
  throw new Error("CRAWLER_ROBOTS_CACHE_TTL_MS must be a non-negative integer");
}

export const CRAWLER_ROBOTS_CACHE_TTL_MS = crawlerRobotsCacheTtlMs;

const crawlerRecrawlIntervalMs = Number(
  process.env.CRAWLER_RECRAWL_INTERVAL_MS,
);

if (
  !Number.isInteger(crawlerRecrawlIntervalMs) ||
  crawlerRecrawlIntervalMs < 0
) {
  throw new Error("CRAWLER_RECRAWL_INTERVAL_MS must be a non-negative integer");
}

export const CRAWLER_RECRAWL_INTERVAL_MS = crawlerRecrawlIntervalMs;
