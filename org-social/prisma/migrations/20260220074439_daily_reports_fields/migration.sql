/*
  Warnings:

  - You are about to drop the column `data` on the `DailyReport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyReport" DROP COLUMN "data",
ADD COLUMN     "activeCustomer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedConnection" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedTkt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expireCustomerDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "internetTkt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newConnectionRequest" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outgoingCalls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingConnection" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingTkt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reasonPendingConnection" TEXT,
ADD COLUMN     "reasonPendingTkt" TEXT,
ADD COLUMN     "renewDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalExpireCustomer" INTEGER NOT NULL DEFAULT 0;
