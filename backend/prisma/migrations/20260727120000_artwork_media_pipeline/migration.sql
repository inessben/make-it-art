-- Advanced artwork media pipeline: HD original, server preview, watermark metadata, storage provider.
ALTER TABLE "artwork"
    ADD COLUMN IF NOT EXISTS "hd_path" TEXT,
    ADD COLUMN IF NOT EXISTS "preview_path" TEXT,
    ADD COLUMN IF NOT EXISTS "storage_provider" TEXT NOT NULL DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS "media_status" TEXT NOT NULL DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS "watermark_applied" BOOLEAN NOT NULL DEFAULT false;

-- Existing public images become the preview until reprocessed.
UPDATE "artwork"
SET "preview_path" = "image_path"
WHERE "preview_path" IS NULL
  AND "image_path" IS NOT NULL;
