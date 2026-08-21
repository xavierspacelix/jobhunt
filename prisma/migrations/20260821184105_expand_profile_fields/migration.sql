-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "certifications" JSONB,
ADD COLUMN     "education" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT;
