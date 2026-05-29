-- CreateTable
CREATE TABLE "SsoSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "issuer" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SsoSettings_pkey" PRIMARY KEY ("id")
);
