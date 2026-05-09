-- CreateEnum
CREATE TYPE "DrawdownType" AS ENUM ('EOD', 'INTRADAY');

-- AlterTable
ALTER TABLE "PropFirmRule" ADD COLUMN "evalDrawdownType" "DrawdownType" NOT NULL DEFAULT 'EOD';
ALTER TABLE "PropFirmRule" ADD COLUMN "fundedDrawdownType" "DrawdownType" NOT NULL DEFAULT 'EOD';
