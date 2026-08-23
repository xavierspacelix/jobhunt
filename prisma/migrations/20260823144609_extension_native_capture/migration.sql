-- CreateEnum
CREATE TYPE "ExtensionScope" AS ENUM ('extension:jobs:write');

-- AlterEnum
ALTER TYPE "SavedJobOrigin" ADD VALUE 'EXTENSION';

-- CreateTable
CREATE TABLE "ExtensionConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" "ExtensionScope" NOT NULL DEFAULT 'extension:jobs:write',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ExtensionConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtensionAuthCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionConnection_userId_key" ON "ExtensionConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionConnection_tokenHash_key" ON "ExtensionConnection"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionAuthCode_codeHash_key" ON "ExtensionAuthCode"("codeHash");

-- CreateIndex
CREATE INDEX "ExtensionAuthCode_expiresAt_idx" ON "ExtensionAuthCode"("expiresAt");

-- CreateIndex
CREATE INDEX "ExtensionAuthCode_userId_expiresAt_idx" ON "ExtensionAuthCode"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ExtensionConnection" ADD CONSTRAINT "ExtensionConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionAuthCode" ADD CONSTRAINT "ExtensionAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
