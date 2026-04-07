/*
  Warnings:

  - Made the column `createdById` on table `CalendarNote` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CalendarNote" ALTER COLUMN "createdById" SET NOT NULL;
