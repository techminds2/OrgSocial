-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinnedChannelId" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pinnedChannelId_fkey" FOREIGN KEY ("pinnedChannelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
