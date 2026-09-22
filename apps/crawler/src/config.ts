import { config } from "dotenv";

config({
  path: new URL("../../../.env", import.meta.url),
});

if (!process.env.CRAWLER_USER_AGENT) {
  throw new Error("CRAWLER_USER_AGENT is not defined");
}

export const CRAWLER_USER_AGENT = process.env.CRAWLER_USER_AGENT;