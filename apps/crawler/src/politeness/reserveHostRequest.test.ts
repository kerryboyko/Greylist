import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@greylist/database";

import { CRAWLER_MIN_HOST_INTERVAL_MS } from "../config.js";
import { reserveHostRequest } from "./reserveHostRequest.js";

const TEST_HOSTNAME = "politeness-test.invalid";
const TEST_URL = `https://${TEST_HOSTNAME}/test`;

describe("reserveHostRequest", () => {
  afterAll(async () => {
    await prisma.crawlHost.deleteMany({
      where: {
        hostname: TEST_HOSTNAME,
      },
    });
  });

  it("reserves sequential request slots for the same host", async () => {
    const first = await reserveHostRequest(TEST_URL);
    const second = await reserveHostRequest(TEST_URL);

    expect(second.getTime() - first.getTime()).toBe(
      CRAWLER_MIN_HOST_INTERVAL_MS,
    );
  });
  it("reserves distinct sequential slots for concurrent workers", async () => {
    const reservations = await Promise.all([
      reserveHostRequest(TEST_URL),
      reserveHostRequest(TEST_URL),
      reserveHostRequest(TEST_URL),
      reserveHostRequest(TEST_URL),
    ]);

    const times = reservations
      .map((reservation) => reservation.getTime())
      .sort((a, b) => a - b);

    for (let i = 1; i < times.length; i++) {
      expect(times[i]! - times[i - 1]!).toBe(CRAWLER_MIN_HOST_INTERVAL_MS);
    }
  });
});
