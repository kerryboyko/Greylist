import robotsParser, { type Robot } from "robots-parser";
import { prisma } from "@greylist/database";
import { CRAWLER_USER_AGENT, CRAWLER_ROBOTS_CACHE_TTL_MS } from "../config.js";
import { CrawlPermission, RobotsPolicyResult } from "../constants.js";
import { waitForHostRequest } from "../politeness/waitForHostRequest.js";

async function cacheRobotsPolicy(
  hostname: string,
  status: number,
  robotsTxt: string | null,
): Promise<void> {
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + CRAWLER_ROBOTS_CACHE_TTL_MS);

  await prisma.crawlHost.update({
    where: {
      hostname,
    },
    data: {
      robotsTxt,
      robotsStatus: status,
      robotsFetchedAt: fetchedAt,
      robotsExpiresAt: expiresAt,
    },
  });
}

export async function isCrawlAllowed(url: string): Promise<CrawlPermission> {
  const result = await getRobotsPolicy(url);

  if (result.policy === RobotsPolicyResult.PARSE) {
    const allowed = result.robot?.isAllowed(url, CRAWLER_USER_AGENT);

    return allowed ? CrawlPermission.ALLOW : CrawlPermission.DENY;
  }

  return result.policy;
}

export async function getRobotsPolicy(
  url: string,
): Promise<{ policy: RobotsPolicyResult; robot?: Robot }> {
  const pageUrl = new URL(url);
  const robotsUrl = new URL("/robots.txt", pageUrl.origin);

  // check for cached robots policy
  const cachedHost = await prisma.crawlHost.findUnique({
    where: {
      hostname: pageUrl.hostname,
    },
    select: {
      robotsTxt: true,
      robotsStatus: true,
      robotsExpiresAt: true,
    },
  });

  const now = new Date();

  if (cachedHost?.robotsExpiresAt && cachedHost.robotsExpiresAt > now) {
    if (cachedHost.robotsStatus === 200 && cachedHost.robotsTxt !== null) {
      const robot = robotsParser(robotsUrl.toString(), cachedHost.robotsTxt);

      return {
        policy: RobotsPolicyResult.PARSE,
        robot,
      };
    }

    if (cachedHost.robotsStatus === 404 || cachedHost.robotsStatus === 410) {
      return {
        policy: RobotsPolicyResult.NO_POLICY,
      };
    }
  }
  try {
    await waitForHostRequest(robotsUrl.toString());

    const response = await fetch(robotsUrl, {
      headers: {
        "User-Agent": CRAWLER_USER_AGENT,
      },
    });

    if (response.status >= 500 && response.status < 600) {
      return { policy: RobotsPolicyResult.DELAY_CRAWL };
    }
    if (response.status === 429) {
      return { policy: RobotsPolicyResult.DELAY_CRAWL };
    }
    if (response.status === 404 || response.status === 410) {
      await cacheRobotsPolicy(pageUrl.hostname, response.status, null);
      return { policy: RobotsPolicyResult.NO_POLICY };
    }
    if (response.status === 200) {
      const robotsText = await response.text();

      await cacheRobotsPolicy(pageUrl.hostname, response.status, robotsText);

      const robot = robotsParser(robotsUrl.toString(), robotsText);

      return { policy: RobotsPolicyResult.PARSE, robot };
    }
    return { policy: RobotsPolicyResult.DO_NOT_CRAWL };
  } catch (e) {
    return { policy: RobotsPolicyResult.DELAY_CRAWL };
  }
}
