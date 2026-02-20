-- This migration exists in DB history but was missing locally.
-- Make it idempotent so it is safe for shadow/replay.

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "actorId" INTEGER,
  ADD COLUMN IF NOT EXISTS "channelId" INTEGER,
  ADD COLUMN IF NOT EXISTS "joinRequestId" INTEGER;

CREATE INDEX IF NOT EXISTS "Notification_actorId_idx" ON "Notification" ("actorId");
CREATE INDEX IF NOT EXISTS "Notification_channelId_idx" ON "Notification" ("channelId");
CREATE INDEX IF NOT EXISTS "Notification_joinRequestId_idx" ON "Notification" ("joinRequestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_actorId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_channelId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_channelId_fkey"
      FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_joinRequestId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_joinRequestId_fkey"
      FOREIGN KEY ("joinRequestId") REFERENCES "JoinRequest"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
