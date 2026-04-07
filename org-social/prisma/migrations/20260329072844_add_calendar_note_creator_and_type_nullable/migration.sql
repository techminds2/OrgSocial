-- CreateEnum
CREATE TYPE "CalendarNoteType" AS ENUM ('PERSONAL', 'MEETING', 'ADMIN_REMINDER');

-- AlterTable
ALTER TABLE "CalendarNote" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "type" "CalendarNoteType" NOT NULL DEFAULT 'PERSONAL';

-- CreateIndex
CREATE INDEX "CalendarNote_createdById_idx" ON "CalendarNote"("createdById");

-- CreateIndex
CREATE INDEX "CalendarNote_userId_type_noteDate_idx" ON "CalendarNote"("userId", "type", "noteDate");

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
