-- AlterEnum
ALTER TYPE "ExtensionScope" ADD VALUE 'extension:account:read';

-- AlterTable
ALTER TABLE "ExtensionConnection" DROP COLUMN "scope",
ADD COLUMN     "scopes" "ExtensionScope"[] DEFAULT ARRAY['extension:jobs:write', 'extension:account:read']::"ExtensionScope"[];
