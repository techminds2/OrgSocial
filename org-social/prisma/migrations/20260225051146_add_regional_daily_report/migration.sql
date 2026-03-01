-- CreateTable
CREATE TABLE "RegionalDailyReport" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" INTEGER NOT NULL,
    "reportYmd" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "totalMeetings" INTEGER,
    "totalBranchesVisited" INTEGER,
    "marketingDaysPlanned" INTEGER,
    "dynamicData" JSONB,
    "remarks" TEXT,

    CONSTRAINT "RegionalDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegionalDailyReport_authorId_reportYmd_idx" ON "RegionalDailyReport"("authorId", "reportYmd");

-- CreateIndex
CREATE INDEX "RegionalDailyReport_reportYmd_idx" ON "RegionalDailyReport"("reportYmd");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalDailyReport_authorId_reportYmd_key" ON "RegionalDailyReport"("authorId", "reportYmd");

-- AddForeignKey
ALTER TABLE "RegionalDailyReport" ADD CONSTRAINT "RegionalDailyReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
