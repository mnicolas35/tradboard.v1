-- Replace remaining PA values with FUNDED before recreating the enum.
UPDATE "Account" SET "accountType" = 'FUNDED' WHERE "accountType" = 'PA';
UPDATE "PropFirmRule" SET "accountType" = 'FUNDED' WHERE "accountType" = 'PA';

-- Recreate AccountType without PA.
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
CREATE TYPE "AccountType" AS ENUM ('EVALUATION', 'FUNDED');
ALTER TABLE "Account" ALTER COLUMN "accountType" TYPE "AccountType" USING "accountType"::text::"AccountType";
ALTER TABLE "PropFirmRule" ALTER COLUMN "accountType" TYPE "AccountType" USING "accountType"::text::"AccountType";
DROP TYPE "AccountType_old";

-- User-specific PropFirm ordering for the sidebar.
CREATE TABLE "UserPropFirmOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propFirmId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPropFirmOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPropFirmOrder_userId_propFirmId_key" ON "UserPropFirmOrder"("userId", "propFirmId");
CREATE INDEX "UserPropFirmOrder_userId_idx" ON "UserPropFirmOrder"("userId");
CREATE INDEX "UserPropFirmOrder_propFirmId_idx" ON "UserPropFirmOrder"("propFirmId");

ALTER TABLE "UserPropFirmOrder" ADD CONSTRAINT "UserPropFirmOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPropFirmOrder" ADD CONSTRAINT "UserPropFirmOrder_propFirmId_fkey" FOREIGN KEY ("propFirmId") REFERENCES "PropFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
