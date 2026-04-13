-- CreateTable
CREATE TABLE "RegionalMonthlyTarget" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "collectionTarget" INTEGER NOT NULL DEFAULT 0,
    "newConnectionTarget" INTEGER NOT NULL DEFAULT 0,
    "renewalTarget" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionalMonthlyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegionalMonthlyTarget_userId_month_idx" ON "RegionalMonthlyTarget"("userId", "month");

-- CreateIndex
CREATE INDEX "RegionalMonthlyTarget_month_idx" ON "RegionalMonthlyTarget"("month");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalMonthlyTarget_userId_month_key" ON "RegionalMonthlyTarget"("userId", "month");

-- AddForeignKey
ALTER TABLE "RegionalMonthlyTarget" ADD CONSTRAINT "RegionalMonthlyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
