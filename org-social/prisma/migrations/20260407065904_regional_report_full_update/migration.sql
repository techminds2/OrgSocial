/*
  Warnings:

  - You are about to drop the column `dynamicData` on the `RegionalDailyReport` table. All the data in the column will be lost.
  - You are about to drop the column `marketingDaysPlanned` on the `RegionalDailyReport` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `RegionalDailyReport` table. All the data in the column will be lost.
  - You are about to drop the column `totalBranchesVisited` on the `RegionalDailyReport` table. All the data in the column will be lost.
  - You are about to drop the column `totalMeetings` on the `RegionalDailyReport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RegionalDailyReport" DROP COLUMN "dynamicData",
DROP COLUMN "marketingDaysPlanned",
DROP COLUMN "remarks",
DROP COLUMN "totalBranchesVisited",
DROP COLUMN "totalMeetings",
ADD COLUMN     "activeCustomers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "branchesVisitedToday" TEXT,
ADD COLUMN     "collectionAchievement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "collectionTarget" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "connectionPendingToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiredCustomers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "immediateActionsTaken" TEXT,
ADD COLUMN     "issueDetails" TEXT,
ADD COLUMN     "keyObservations" TEXT,
ADD COLUMN     "newConnectionAchievementPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "newConnectionTarget" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newConnectionsToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextDayPlan" TEXT,
ADD COLUMN     "pendingTickets" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reasonPendingConnection" TEXT,
ADD COLUMN     "reasonPendingTickets" TEXT,
ADD COLUMN     "renewalAchievementPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "renewalPending" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "renewalTarget" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "renewalsToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportRequiredFromHO" TEXT,
ADD COLUMN     "ticketsClosedToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCollection" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCustomerBase" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalNewConnections" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTickets" INTEGER NOT NULL DEFAULT 0;
