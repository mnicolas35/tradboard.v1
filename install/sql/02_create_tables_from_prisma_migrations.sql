-- TradBoard v1 - SQL consolide depuis prisma/migrations
-- Usage direct: psql "postgresql://USER:PASSWORD@DB_HOST:5432/tradboard" -f sql/02_create_tables_from_prisma_migrations.sql
-- En production, preferer: npx prisma migrate deploy


-- ============================================================================
-- Migration: 20260501205358_init
-- ============================================================================

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'USER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('EVALUATION', 'PA', 'FUNDED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PASSED', 'FAILED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('PURCHASE', 'RESET', 'SUBSCRIPTION', 'ACTIVATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "googleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropFirm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropFirm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropFirmRule" (
    "id" TEXT NOT NULL,
    "propFirmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "accountSize" DECIMAL(12,2) NOT NULL,
    "target" DECIMAL(12,2) NOT NULL,
    "maxDrawdown" DECIMAL(12,2) NOT NULL,
    "dailyDrawdown" DECIMAL(12,2),
    "buffer" DECIMAL(12,2),
    "consistencyPercent" DECIMAL(5,2),
    "minTradingDays" INTEGER,
    "defaultPurchasePrice" DECIMAL(12,2),
    "defaultResetPrice" DECIMAL(12,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropFirmRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propFirmId" TEXT NOT NULL,
    "propFirmRuleId" TEXT,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "accountSize" DECIMAL(12,2) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(12,2),
    "activationDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "profitLoss" DECIMAL(12,2) NOT NULL,
    "tradeCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payoutDate" DATE NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PropFirm_name_key" ON "PropFirm"("name");

-- CreateIndex
CREATE INDEX "PropFirm_isActive_idx" ON "PropFirm"("isActive");

-- CreateIndex
CREATE INDEX "PropFirmRule_propFirmId_idx" ON "PropFirmRule"("propFirmId");

-- CreateIndex
CREATE INDEX "PropFirmRule_accountType_idx" ON "PropFirmRule"("accountType");

-- CreateIndex
CREATE INDEX "PropFirmRule_isActive_idx" ON "PropFirmRule"("isActive");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_propFirmId_idx" ON "Account"("propFirmId");

-- CreateIndex
CREATE INDEX "Account_propFirmRuleId_idx" ON "Account"("propFirmRuleId");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "Account_accountType_idx" ON "Account"("accountType");

-- CreateIndex
CREATE INDEX "TradingDay_userId_idx" ON "TradingDay"("userId");

-- CreateIndex
CREATE INDEX "TradingDay_tradeDate_idx" ON "TradingDay"("tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "TradingDay_accountId_tradeDate_key" ON "TradingDay"("accountId", "tradeDate");

-- CreateIndex
CREATE INDEX "AccountExpense_userId_idx" ON "AccountExpense"("userId");

-- CreateIndex
CREATE INDEX "AccountExpense_accountId_idx" ON "AccountExpense"("accountId");

-- CreateIndex
CREATE INDEX "AccountExpense_expenseDate_idx" ON "AccountExpense"("expenseDate");

-- CreateIndex
CREATE INDEX "AccountExpense_type_idx" ON "AccountExpense"("type");

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "Payout_accountId_idx" ON "Payout"("accountId");

-- CreateIndex
CREATE INDEX "Payout_payoutDate_idx" ON "Payout"("payoutDate");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- AddForeignKey
ALTER TABLE "PropFirmRule" ADD CONSTRAINT "PropFirmRule_propFirmId_fkey" FOREIGN KEY ("propFirmId") REFERENCES "PropFirm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_propFirmId_fkey" FOREIGN KEY ("propFirmId") REFERENCES "PropFirm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_propFirmRuleId_fkey" FOREIGN KEY ("propFirmRuleId") REFERENCES "PropFirmRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingDay" ADD CONSTRAINT "TradingDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingDay" ADD CONSTRAINT "TradingDay_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountExpense" ADD CONSTRAINT "AccountExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountExpense" ADD CONSTRAINT "AccountExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Migration: 20260502120000_add_currency_platform_exchange_rates
-- ============================================================================

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR');

-- CreateEnum
CREATE TYPE "AccountPlatform" AS ENUM ('RITHMIC', 'TRADOVATE', 'NINJATRADER', 'MT5', 'DXTRADE', 'MATCHTRADER', 'OTHER');

-- AlterTable
ALTER TABLE "PropFirmRule" ADD COLUMN "activationPrice" DECIMAL(12,2),
ADD COLUMN "minTradingDaysForPayout" INTEGER,
ADD COLUMN "promo" TEXT;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "accountNumber" TEXT,
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN "platform" "AccountPlatform",
ADD COLUMN "promoUsed" TEXT;

-- AlterTable
ALTER TABLE "AccountExpense" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseCurrency" "Currency" NOT NULL,
    "targetCurrency" "Currency" NOT NULL,
    "rate" DECIMAL(12,6) NOT NULL,
    "rateDate" DATE NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_platform_idx" ON "Account"("platform");

-- CreateIndex
CREATE INDEX "ExchangeRate_userId_idx" ON "ExchangeRate"("userId");

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_targetCurrency_idx" ON "ExchangeRate"("baseCurrency", "targetCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_rateDate_idx" ON "ExchangeRate"("rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_userId_baseCurrency_targetCurrency_rateDate_key" ON "ExchangeRate"("userId", "baseCurrency", "targetCurrency", "rateDate");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Migration: 20260502143000_account_rules_payout_theme
-- ============================================================================

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


-- ============================================================================
-- Migration: 20260503100000_propfirm_acronym_rule_visibility
-- ============================================================================

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


-- ============================================================================
-- Migration: 20260503113000_remove_pa_user_propfirm_order
-- ============================================================================

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


-- ============================================================================
-- Migration: 20260503150000_add_funded_rule_consistency
-- ============================================================================

ALTER TABLE "PropFirmRule" ADD COLUMN "fundedConsistencyPercent" DECIMAL(5, 2);


-- ============================================================================
-- Migration: 20260503162000_add_funded_reset_price
-- ============================================================================

ALTER TABLE "PropFirmRule" ADD COLUMN "defaultFundedResetPrice" DECIMAL(12, 2);


-- ============================================================================
-- Migration: 20260504120000_add_evaluation_min_daily_profit
-- ============================================================================

ALTER TABLE "PropFirmRule" ADD COLUMN "minDailyProfit" DECIMAL(12, 2);

ALTER TABLE "AccountRuleOverride" ADD COLUMN "minDailyProfit" DECIMAL(12, 2);


-- ============================================================================
-- Migration: 20260504123000_allow_multiple_trades_per_day
-- ============================================================================

DROP INDEX IF EXISTS "TradingDay_accountId_tradeDate_key";

CREATE INDEX IF NOT EXISTS "TradingDay_accountId_idx" ON "TradingDay"("accountId");


-- ============================================================================
-- Migration: 20260506120000_add_password_auth_fields
-- ============================================================================

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);


-- ============================================================================
-- Migration: 20260509100000_add_drawdown_type
-- ============================================================================

-- CreateEnum
CREATE TYPE "DrawdownType" AS ENUM ('EOD', 'INTRADAY');

-- AlterTable
ALTER TABLE "PropFirmRule" ADD COLUMN "evalDrawdownType" "DrawdownType" NOT NULL DEFAULT 'EOD';
ALTER TABLE "PropFirmRule" ADD COLUMN "fundedDrawdownType" "DrawdownType" NOT NULL DEFAULT 'EOD';


-- ============================================================================
-- Migration: 20260509110000_fix_theme_preference_values
-- ============================================================================

-- Reset any invalid theme preference values to 'LIGHT'
UPDATE "User" SET "themePreference" = 'LIGHT' WHERE "themePreference" NOT IN ('LIGHT', 'DARK');


-- ============================================================================
-- Migration: 20260509120000_add_drawdown_at_close
-- ============================================================================

-- AlterTable
ALTER TABLE "TradingDay" ADD COLUMN "drawdownAtClose" DECIMAL(12,2);


-- ============================================================================
-- Migration: 20260513190000_add_audit_log
-- ============================================================================

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- Migration: 20260523143000_add_trader_full_share_threshold
-- ============================================================================

ALTER TABLE "PropFirmRule" ADD COLUMN "traderFullShareUntilAmount" DECIMAL(12, 2);

ALTER TABLE "AccountRuleOverride" ADD COLUMN "traderFullShareUntilAmount" DECIMAL(12, 2);
