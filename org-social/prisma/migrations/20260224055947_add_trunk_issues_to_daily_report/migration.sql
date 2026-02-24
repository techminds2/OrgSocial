-- AlterTable
ALTER TABLE "DailyReport" ADD COLUMN     "trunkIssueCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trunkIssueRemarks" TEXT;
