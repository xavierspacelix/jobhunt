-- CreateEnum
CREATE TYPE "SavedJobOrigin" AS ENUM ('MANUAL', 'SEARCH');

-- CreateTable
CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "origin" "SavedJobOrigin" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_userId_jobId_key" ON "SavedJob"("userId", "jobId");

-- Backfill search recommendations and tracked applications so existing user
-- visibility is preserved when job listing becomes user-scoped.
INSERT INTO "SavedJob" ("id", "userId", "jobId", "origin", "createdAt")
SELECT 'saved_' || md5("userId" || ':' || "jobId"), "userId", "jobId",
       'SEARCH'::"SavedJobOrigin", "createdAt"
FROM "Recommendation"
ON CONFLICT ("userId", "jobId") DO NOTHING;

INSERT INTO "SavedJob" ("id", "userId", "jobId", "origin", "createdAt")
SELECT 'saved_' || md5("userId" || ':' || "jobId"), "userId", "jobId",
       'MANUAL'::"SavedJobOrigin", "createdAt"
FROM "Application"
ON CONFLICT ("userId", "jobId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
