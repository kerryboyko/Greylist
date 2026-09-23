import { setTimeout } from "node:timers/promises";

import { reserveHostRequest } from "./reserveHostRequest.js";

export async function waitForHostRequest(
  url: string,
): Promise<void> {
  const reservedAt = await reserveHostRequest(url);

  const waitMs = reservedAt.getTime() - Date.now();

  if (waitMs > 0) {
    await setTimeout(waitMs);
  }
}