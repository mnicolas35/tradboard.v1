-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "PayoutRuleType" AS ENUM ('NONE', 'BUFFER_ONLY', 'APEX', 'TAKE_PROFIT_TRADER', 'CUSTOM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'LIGHT';

-- AlterTable
ALTER TABLE "PropFirmRule" ADD COLUMN "defaultActivationPrice" DECIMAL(12,2),
ADD COLUMN "minDailyProfitForPayout" DECIMAL(12,2),
ADD COLUMN "minPayoutTradingDays" INTEGER,
ADD COLUMN "payoutBuffer" DECIMAL(12,2),
ADD COLUMN "payoutRuleType" "PayoutRuleType" NOT NULL DEFAULT 'NONE',
ADD COLUMN "promoNote" TEXT,
ADD COLUMN "traderSharePercent" DECIMAL(5,2);

-- Backfill new fields from existing aliases where possible.
UPDATE "PropFirmRule"
SET "minPayoutTradingDays" = "minTradingDaysForPayout"
WHERE "minPayoutTradingDays" IS NULL;

UPDATE "PropFirmRule"
SET "defaultActivationPrice" = "activationPrice"
WHERE "defaultActivationPrice" IS NULL;

UPDATE "PropFirmRule"
SET "promoNote" = "promo"
WHERE "promoNote" IS NULL;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "parentAccountId" TEXT;

-- CreateTable
CREATE TABLE "AccountRuleOverride" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "target" DECIMAL(12,2),
    "maxDrawdown" DECIMAL(12,2),
    "dailyDrawdown" DECIMAL(12,2),
    "buffer" DECIMAL(12,2),
    "payoutBuffer" DECIMAL(12,2),
    "minTradingDays" INTEGER,
    "minPayoutTradingDays" INTEGER,
    "minDailyProfitForPayout" DECIMAL(12,2),
    "consistencyPercent" DECIMAL(5,2),
    "payoutRuleType" "PayoutRuleType",
    "traderSharePercent" DECIMAL(5,2),
    "defaultPurchasePrice" DECIMAL(12,2),
    "defaultActivationPrice" DECIMAL(12,2),
    "defaultResetPrice" DECIMAL(12,2),
    "promoNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_parentAccountId_idx" ON "Account"("parentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRuleOverride_accountId_key" ON "AccountRuleOverride"("accountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRuleOverride" ADD CONSTRAINT "AccountRuleOverride_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
