DROP INDEX IF EXISTS "TradingDay_accountId_tradeDate_key";

CREATE INDEX IF NOT EXISTS "TradingDay_accountId_idx" ON "TradingDay"("accountId");
