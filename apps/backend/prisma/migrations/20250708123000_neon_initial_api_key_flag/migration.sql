CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" SERIAL PRIMARY KEY
);

-- AlterTable
ALTER TABLE "ApiKeySet" ADD COLUMN     "neonIntegrationInitialKey" BOOLEAN NOT NULL DEFAULT false;
