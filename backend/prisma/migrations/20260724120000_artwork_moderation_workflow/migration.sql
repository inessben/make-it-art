ALTER TABLE "artwork"
ADD COLUMN "moderation_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "moderation_note" TEXT,
ADD COLUMN "moderated_at" TIMESTAMP(3),
ADD COLUMN "moderated_by_admin_id" INTEGER;

CREATE INDEX "artwork_moderation_status_idx" ON "artwork"("moderation_status");
CREATE INDEX "artwork_moderated_by_admin_id_idx" ON "artwork"("moderated_by_admin_id");

ALTER TABLE "artwork"
ADD CONSTRAINT "artwork_moderated_by_admin_id_fkey"
FOREIGN KEY ("moderated_by_admin_id") REFERENCES "user"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
