/*
  Warnings:

  - Made the column `channelId` on table `Post` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "channelId" SET NOT NULL;
