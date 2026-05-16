CREATE TABLE "MarketWatchItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "displaySymbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "quoteType" TEXT,
    "instrumentType" TEXT NOT NULL,
    "contractRoot" TEXT,
    "activeContractCode" TEXT,
    "activeContractMonth" INTEGER,
    "activeContractYear" INTEGER,
    "feedSymbol" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'YAHOO',
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketWatchItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketWatchItem_userId_symbol_key" ON "MarketWatchItem"("userId", "symbol");
CREATE INDEX "MarketWatchItem_userId_idx" ON "MarketWatchItem"("userId");
CREATE INDEX "MarketWatchItem_symbol_idx" ON "MarketWatchItem"("symbol");
CREATE INDEX "MarketWatchItem_sortOrder_idx" ON "MarketWatchItem"("sortOrder");

ALTER TABLE "MarketWatchItem" ADD CONSTRAINT "MarketWatchItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
