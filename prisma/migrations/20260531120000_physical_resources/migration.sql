-- Physical / non-system access module: doors, gates, cars, … with a configurable
-- type and access method (physical key, app, keycard, …), plus per-grant
-- credential tracking, expiry and an optional risk level on the resource.

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessMethod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "requiresCredential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "typeId" TEXT NOT NULL,
    "location" TEXT,
    "identifier" TEXT,
    "riskLevelId" TEXT,
    "ownerPersonId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAccess" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "credentialId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "credentialReturned" BOOLEAN NOT NULL DEFAULT false,
    "credentialReturnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "expiryNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_label_key" ON "ResourceType"("label");

-- CreateIndex
CREATE UNIQUE INDEX "AccessMethod_label_key" ON "AccessMethod"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_name_key" ON "Resource"("name");

-- CreateIndex
CREATE INDEX "Resource_typeId_idx" ON "Resource"("typeId");

-- CreateIndex
CREATE INDEX "Resource_riskLevelId_idx" ON "Resource"("riskLevelId");

-- CreateIndex
CREATE INDEX "Resource_ownerPersonId_idx" ON "Resource"("ownerPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAccess_personId_resourceId_methodId_key" ON "ResourceAccess"("personId", "resourceId", "methodId");

-- CreateIndex
CREATE INDEX "ResourceAccess_expiresAt_idx" ON "ResourceAccess"("expiresAt");

-- CreateIndex
CREATE INDEX "ResourceAccess_revokedAt_idx" ON "ResourceAccess"("revokedAt");

-- CreateIndex
CREATE INDEX "ResourceAccess_personId_idx" ON "ResourceAccess"("personId");

-- CreateIndex
CREATE INDEX "ResourceAccess_resourceId_idx" ON "ResourceAccess"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceAccess_methodId_idx" ON "ResourceAccess"("methodId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_riskLevelId_fkey" FOREIGN KEY ("riskLevelId") REFERENCES "RiskLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccess" ADD CONSTRAINT "ResourceAccess_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccess" ADD CONSTRAINT "ResourceAccess_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAccess" ADD CONSTRAINT "ResourceAccess_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "AccessMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
