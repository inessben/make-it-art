ALTER TABLE "collection"
ADD COLUMN "is_default_favorites" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "collection_user_default_favorites_key"
ON "collection"("user_id")
WHERE "is_default_favorites" = true AND "user_id" IS NOT NULL;
