-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" INTEGER NOT NULL,
    "reportYmd" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyReport_authorId_reportYmd_idx" ON "DailyReport"("authorId", "reportYmd");

-- CreateIndex
CREATE INDEX "DailyReport_reportYmd_idx" ON "DailyReport"("reportYmd");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_authorId_reportYmd_key" ON "DailyReport"("authorId", "reportYmd");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
