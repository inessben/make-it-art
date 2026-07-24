ALTER TABLE "admin"
ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "admin"
SET "is_super_admin" = true;
