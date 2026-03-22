-- CreateTable
CREATE TABLE "CalendarNote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "noteDate" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarNote_userId_noteDate_idx" ON "CalendarNote"("userId", "noteDate");
