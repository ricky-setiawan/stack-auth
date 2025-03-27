-- AlterEnum
ALTER TYPE "TeamSystemPermission" ADD VALUE 'MANAGE_API_KEYS';

-- AlterTable
<<<<<<<< HEAD:apps/backend/prisma/migrations/20250326032040_project_api_keys/migration.sql
ALTER TABLE "ProjectConfig" ADD COLUMN     "allowTeamAPIKeys" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowTenancyAPIKeys" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowUserAPIKeys" BOOLEAN NOT NULL DEFAULT false;
========
ALTER TABLE "ProjectConfig" ADD COLUMN     "allowTeamApiKeys" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowUserApiKeys" BOOLEAN NOT NULL DEFAULT false;
>>>>>>>> ce4866ef (remove tennancy api key stuff):apps/backend/prisma/migrations/20250327193357_api_keys/migration.sql

-- CreateTable
CREATE TABLE "ProjectApiKey" (
    "projectId" TEXT NOT NULL,
    "tenancyId" UUID NOT NULL,
    "id" UUID NOT NULL,
    "secretApiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "manuallyRevokedAt" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL,
    "teamId" UUID,
    "projectUserId" UUID,

    CONSTRAINT "ProjectApiKey_pkey" PRIMARY KEY ("tenancyId","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectApiKey_secretApiKey_key" ON "ProjectApiKey"("secretApiKey");

-- AddForeignKey
ALTER TABLE "ProjectApiKey" ADD CONSTRAINT "ProjectApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApiKey" ADD CONSTRAINT "ProjectApiKey_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApiKey" ADD CONSTRAINT "ProjectApiKey_tenancyId_projectUserId_fkey" FOREIGN KEY ("tenancyId", "projectUserId") REFERENCES "ProjectUser"("tenancyId", "projectUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApiKey" ADD CONSTRAINT "ProjectApiKey_tenancyId_teamId_fkey" FOREIGN KEY ("tenancyId", "teamId") REFERENCES "Team"("tenancyId", "teamId") ON DELETE CASCADE ON UPDATE CASCADE;
