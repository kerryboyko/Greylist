/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `CrawlJob` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CrawlJob_url_idx";

-- CreateIndex
CREATE UNIQUE INDEX "CrawlJob_url_key" ON "CrawlJob"("url");
