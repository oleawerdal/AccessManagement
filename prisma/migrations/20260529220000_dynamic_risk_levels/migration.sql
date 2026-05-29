-- Convert the fixed RiskLevel enum into a configurable RiskLevel table.
-- The enum type and the new table share the name "RiskLevel", so the enum must
-- be dropped before the table is created. We therefore backfill the new FK
-- column from the enum text first, then drop the enum, then create the table.

-- 1. Add the FK column (nullable during backfill).
ALTER TABLE "Role" ADD COLUMN "riskLevelId" TEXT;

-- 2. Backfill from the old enum value to stable ids.
UPDATE "Role" SET "riskLevelId" = CASE "riskLevel"::text
  WHEN 'LOW'      THEN 'risk_low'
  WHEN 'NORMAL'   THEN 'risk_normal'
  WHEN 'HIGH'     THEN 'risk_high'
  WHEN 'CRITICAL' THEN 'risk_critical'
  ELSE 'risk_normal'
END;

-- 3. Drop the old enum column and the enum type (frees the name "RiskLevel").
ALTER TABLE "Role" DROP COLUMN "riskLevel";
DROP TYPE "RiskLevel";

-- 4. Create the new table.
CREATE TABLE "RiskLevel" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "severity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskLevel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RiskLevel_label_key" ON "RiskLevel"("label");
CREATE INDEX "RiskLevel_severity_idx" ON "RiskLevel"("severity");

-- 5. Seed the four levels that previously existed as enum values.
INSERT INTO "RiskLevel" ("id", "label", "description", "color", "severity") VALUES
  ('risk_low',      'Lav',     'Begrenset tilgang med liten risiko ved misbruk.',  '#64748b', 1),
  ('risk_normal',   'Normal',  'Ordinær brukertilgang.',                           '#3b82f6', 2),
  ('risk_high',     'Høy',     'Utvidet tilgang som krever ekstra oppfølging.',    '#f59e0b', 3),
  ('risk_critical', 'Kritisk', 'Full eller administrativ tilgang med høy risiko.', '#ef4444', 4);

-- 6. Enforce NOT NULL + FK + index now that values reference real rows.
ALTER TABLE "Role" ALTER COLUMN "riskLevelId" SET NOT NULL;
ALTER TABLE "Role" ADD CONSTRAINT "Role_riskLevelId_fkey"
  FOREIGN KEY ("riskLevelId") REFERENCES "RiskLevel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Role_riskLevelId_idx" ON "Role"("riskLevelId");
