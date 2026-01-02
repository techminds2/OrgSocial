/*
  Warnings:

  - Made the column `createdById` on table `Channel` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Channel" DROP CONSTRAINT "Channel_createdById_fkey";

-- AlterTable
ALTER TABLE "Channel" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
