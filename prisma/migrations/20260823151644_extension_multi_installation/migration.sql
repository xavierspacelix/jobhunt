-- DropIndex
DROP INDEX "ExtensionConnection_userId_key";

-- AlterTable
ALTER TABLE "ExtensionAuthCode" ADD COLUMN     "installationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExtensionConnection" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "extensionId" TEXT NOT NULL,
ADD COLUMN     "installationId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionAuthCode_userId_key" ON "ExtensionAuthCode"("userId");

-- CreateIndex
CREATE INDEX "ExtensionConnection_userId_revokedAt_idx" ON "ExtensionConnection"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionConnection_userId_installationId_key" ON "ExtensionConnection"("userId", "installationId");
