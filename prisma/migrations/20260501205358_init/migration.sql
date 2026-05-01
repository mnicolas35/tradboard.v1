-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

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
