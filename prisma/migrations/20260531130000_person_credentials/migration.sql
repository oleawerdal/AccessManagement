-- Reusable physical credentials (key cards, fobs, keys) registered on a person
-- and linked to resource accesses, so the same card id can be reused across
-- resources instead of being re-typed each time.

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "label" TEXT,
    "identifier" TEXT NOT NULL,
    "methodId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Credential_personId_idx" ON "Credential"("personId");

-- CreateIndex
CREATE INDEX "Credential_methodId_idx" ON "Credential"("methodId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_personId_identifier_key" ON "Credential"("personId", "identifier");

-- AlterTable
ALTER TABLE "ResourceAccess" ADD COLUMN "personCredentialId" TEXT;

-- CreateIndex
CREATE INDEX "ResourceAccess_personCredentialId_idx" ON "ResourceAccess"("personCredentialId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "AccessMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccess" ADD CONSTRAINT "ResourceAccess_personCredentialId_fkey" FOREIGN KEY ("personCredentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
