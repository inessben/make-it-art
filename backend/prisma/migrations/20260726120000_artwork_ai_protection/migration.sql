-- Public watermarked previews + controlled digital download quotas.
ALTER TABLE "artwork"
ADD COLUMN "preview_path" TEXT;

ALTER TABLE "digital_entitlement"
ADD COLUMN "download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "download_limit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "download_expires_at" TIMESTAMP(6),
ADD COLUMN "last_downloaded_at" TIMESTAMP(6);
