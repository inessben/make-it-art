CREATE TYPE "ArtworkVisibility" AS ENUM ('PUBLISHED', 'HIDDEN', 'ARCHIVED');

ALTER TABLE "artwork"
    ADD COLUMN "visibility" "ArtworkVisibility" NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN "archived_at" TIMESTAMP(6);

CREATE INDEX "artwork_visibility_moderation_status_created_at_idx"
    ON "artwork"("visibility", "moderation_status", "created_at");
