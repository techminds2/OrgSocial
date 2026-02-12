-- CreateTable
CREATE TABLE "PostSeen" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "channelId" INTEGER NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostSeen_userId_channelId_idx" ON "PostSeen"("userId", "channelId");

-- CreateIndex
CREATE INDEX "PostSeen_channelId_seenAt_idx" ON "PostSeen"("channelId", "seenAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostSeen_userId_postId_key" ON "PostSeen"("userId", "postId");

-- AddForeignKey
ALTER TABLE "PostSeen" ADD CONSTRAINT "PostSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSeen" ADD CONSTRAINT "PostSeen_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSeen" ADD CONSTRAINT "PostSeen_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
