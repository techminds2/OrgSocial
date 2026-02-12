/*
  Warnings:

  - Changed the type of `priority` on the `Todo` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High');

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "completedAt" TIMESTAMP(3),
DROP COLUMN "priority",
ADD COLUMN     "priority" "Priority" NOT NULL;

-- CreateIndex
CREATE INDEX "Todo_userId_completed_completedAt_idx" ON "Todo"("userId", "completed", "completedAt");
