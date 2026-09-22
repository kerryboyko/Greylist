export const ONE_MINUTE = 60_000; // One minute in milliseconds.

// Robots policy

export const CrawlPermission = {
  ALLOW: "ALLOW",
  DENY: "DENY",
  DELAY: "DELAY",
} as const;

export type CrawlPermission =
  (typeof CrawlPermission)[keyof typeof CrawlPermission];

export const RobotsPolicyResult = {
  PARSE: "PARSE",
  NO_POLICY: CrawlPermission.ALLOW,
  DO_NOT_CRAWL: CrawlPermission.DENY,
  DELAY_CRAWL: CrawlPermission.DELAY,
} as const;

export type RobotsPolicyResult =
  (typeof RobotsPolicyResult)[keyof typeof RobotsPolicyResult];
