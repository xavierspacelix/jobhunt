-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "category" TEXT,
ADD COLUMN     "companyDetails" JSONB,
ADD COLUMN     "companyRefId" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "externalJobId" TEXT,
ADD COLUMN     "recruiter" TEXT,
ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "skills" TEXT[];
