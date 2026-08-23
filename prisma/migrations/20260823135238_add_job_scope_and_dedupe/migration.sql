/*
  Warnings:

  - A unique constraint covering the columns `[dedupeKey]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "JobScope" AS ENUM ('SHARED', 'PRIVATE');

-- DropIndex
DROP INDEX "Job_sourceUrl_key";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "scope" "JobScope" NOT NULL DEFAULT 'SHARED';

-- Preserve legacy jobs as ownerless shared canonicals.
UPDATE "Job"
SET "scope" = 'SHARED', "ownerId" = NULL, "dedupeKey" = "sourceUrl";

ALTER TABLE "Job" ALTER COLUMN "dedupeKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_scope_ownerId_idx" ON "Job"("scope", "ownerId");

-- CreateIndex
CREATE INDEX "Job_sourceUrl_idx" ON "Job"("sourceUrl");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
