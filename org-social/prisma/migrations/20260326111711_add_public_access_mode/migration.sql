-- CreateEnum
CREATE TYPE "PublicAccessMode" AS ENUM ('open', 'request');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "publicAccessMode" "PublicAccessMode" NOT NULL DEFAULT 'request';
