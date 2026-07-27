-- AlterTable
ALTER TABLE "artwork" ADD COLUMN "is_sold" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark artworks with a current owner as sold
UPDATE "artwork"
SET "is_sold" = true
WHERE "id" IN (
  SELECT DISTINCT "artwork_id"
  FROM "ownership_token"
  WHERE "is_current_owner" = true
);
