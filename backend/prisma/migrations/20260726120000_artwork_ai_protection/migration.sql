-- Public watermarked previews + controlled digital download quotas.
ALTER TABLE "artwork"
ADD COLUMN IF NOT EXISTS "preview_path" TEXT;

ALTER TABLE "digital_entitlement"
ADD COLUMN IF NOT EXISTS "download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "download_limit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "download_expires_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "last_downloaded_at" TIMESTAMP(6);
