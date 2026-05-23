ALTER TABLE "MarketWatchItem" ALTER COLUMN "source" SET DEFAULT 'YAHOO';

UPDATE "MarketWatchItem"
SET "source" = 'YAHOO'
WHERE "instrumentType" = 'FUTURE';
