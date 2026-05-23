ALTER TABLE "MarketWatchItem" ALTER COLUMN "source" SET DEFAULT 'CME';

UPDATE "MarketWatchItem"
SET "source" = 'CME'
WHERE "instrumentType" = 'FUTURE';
