-- AlterTable
ALTER TABLE "PropFirm" ADD COLUMN "acronym" TEXT NOT NULL DEFAULT 'PF';

-- Backfill common acronyms for existing demo data, then derive a fallback from the name.
UPDATE "PropFirm"
SET "acronym" = CASE
  WHEN lower("name") LIKE '%apex%' THEN 'APX'
  WHEN lower("name") LIKE '%takeprofit%' OR lower("name") LIKE '%take profit%' THEN 'TPT'
  WHEN lower("name") LIKE '%topstep%' THEN 'TPS'
  ELSE upper(substring(regexp_replace("name", '[^A-Za-z0-9]', '', 'g') from 1 for 3))
END;

-- AlterTable
ALTER TABLE "PropFirmRule" ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "isStandard" BOOLEAN NOT NULL DEFAULT false;

-- Existing rules become standard shared rules.
UPDATE "PropFirmRule" SET "isStandard" = true;

-- CreateIndex
CREATE INDEX "PropFirmRule_createdByUserId_idx" ON "PropFirmRule"("createdByUserId");

-- CreateIndex
CREATE INDEX "PropFirmRule_isStandard_idx" ON "PropFirmRule"("isStandard");

-- AddForeignKey
ALTER TABLE "PropFirmRule" ADD CONSTRAINT "PropFirmRule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
