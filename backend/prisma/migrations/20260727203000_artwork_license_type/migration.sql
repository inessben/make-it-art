CREATE TYPE "ArtworkLicenseType" AS ENUM ('PERSONAL', 'COMMERCIAL', 'EXCLUSIVE');

ALTER TABLE "artwork"
    ADD COLUMN "license_type" "ArtworkLicenseType" NOT NULL DEFAULT 'PERSONAL';
