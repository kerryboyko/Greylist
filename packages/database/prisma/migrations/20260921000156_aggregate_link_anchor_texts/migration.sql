/*
  Warnings:

  - You are about to drop the column `anchorText` on the `Link` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fromPageId,toUrl]` on the table `Link` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Link" DROP COLUMN "anchorText",
ADD COLUMN     "anchorTexts" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Link_fromPageId_toUrl_key" ON "Link"("fromPageId", "toUrl");
