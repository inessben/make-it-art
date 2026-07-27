-- Add artist withdrawal workflow and idempotent notification event keys.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArtistWithdrawalStatus') THEN
    CREATE TYPE "ArtistWithdrawalStatus" AS ENUM (
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'PAID',
      'CANCELED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "artist_withdrawal" (
  "id" SERIAL NOT NULL,
  "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "artist_id" INTEGER NOT NULL,
  "requested_by_user_id" INTEGER NOT NULL,
  "reviewed_by_user_id" INTEGER,
  "amount" INTEGER NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'EUR',
  "status" "ArtistWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  "admin_note" TEXT,
  "payout_reference" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(6),
  "paid_at" TIMESTAMP(6),
  CONSTRAINT "artist_withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "artist_withdrawal_public_id_key"
  ON "artist_withdrawal"("public_id");

CREATE INDEX IF NOT EXISTS "artist_withdrawal_artist_id_status_created_at_idx"
  ON "artist_withdrawal"("artist_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "artist_withdrawal_status_created_at_idx"
  ON "artist_withdrawal"("status", "created_at");

ALTER TABLE "artist_withdrawal"
  ADD CONSTRAINT "artist_withdrawal_artist_id_fkey"
  FOREIGN KEY ("artist_id") REFERENCES "artist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artist_withdrawal"
  ADD CONSTRAINT "artist_withdrawal_requested_by_user_id_fkey"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "artist_withdrawal"
  ADD CONSTRAINT "artist_withdrawal_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "notification_user_type_event_key_key"
  ON "notification"("user_id", "type", ((payload ->> 'eventKey')))
  WHERE payload ? 'eventKey';
