/*
  Warnings:

  - You are about to drop the column `joinedAt` on the `ChannelMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChannelMember" DROP COLUMN "joinedAt",
ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ChannelMember_userId_idx" ON "ChannelMember"("userId");

-- CreateIndex
CREATE INDEX "ChannelMember_channelId_idx" ON "ChannelMember"("channelId");
