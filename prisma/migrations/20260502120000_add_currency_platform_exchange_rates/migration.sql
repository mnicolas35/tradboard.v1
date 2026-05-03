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
