-- Preserve the original discovery timestamp as the first time
-- this link was observed.
ALTER TABLE "Link"
RENAME COLUMN "discoveredAt" TO "firstSeenAt";

-- Existing links were present when they were discovered, so use
-- their original discovery time as the initial last-seen time.
ALTER TABLE "Link"
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

UPDATE "Link"
SET "lastSeenAt" = "firstSeenAt";

ALTER TABLE "Link"
ALTER COLUMN "lastSeenAt" SET NOT NULL,
ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;

-- All existing Link rows represent links observed during successful
-- crawls, so they begin as currently present.
ALTER TABLE "Link"
ADD COLUMN "isPresent" BOOLEAN NOT NULL DEFAULT true;