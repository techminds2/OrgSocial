-- This migration exists in DB history but was missing locally.
-- Make it idempotent so it is safe for shadow/replay.

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
  ON "Notification" ("userId", "isRead");

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification" ("userId", "createdAt");
