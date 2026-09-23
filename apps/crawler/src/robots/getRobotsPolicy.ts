import { CRAWLER_USER_AGENT } from "../config.js";
import robotsParser, { type Robot } from "robots-parser";
import { CrawlPermission, RobotsPolicyResult } from "../constants.js";
import { waitForHostRequest } from "../politeness/waitForHostRequest.js";


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
      return { policy: RobotsPolicyResult.NO_POLICY };
    }
    if (response.status === 200) {
      const robotsText = await response.text();
      const robot = robotsParser(robotsUrl.toString(), robotsText);

      return { policy: RobotsPolicyResult.PARSE, robot };
    }
    return { policy: RobotsPolicyResult.DO_NOT_CRAWL };
  } catch (e) {
    return { policy: RobotsPolicyResult.DELAY_CRAWL };
  }
}
