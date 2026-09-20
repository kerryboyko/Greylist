import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.info(`Upserting Seed`);
  await prisma.sourcePolicy.upsert({
    where: {
      domain: "en.wikipedia.org",
    },
    update: {},
    create: {
      domain: "en.wikipedia.org",
      classification: "PRIMARY",
      scopes: ["/wiki/"],
      expertise: [],
      rationale:
        "General-purpose encyclopedia with human editorial oversight and extensive source citations.",
    },
  });
}

main()
  .then(async () => {
    console.info(`Awaiting Disconnect`);

    await prisma.$disconnect();
    console.info(`Done`);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
