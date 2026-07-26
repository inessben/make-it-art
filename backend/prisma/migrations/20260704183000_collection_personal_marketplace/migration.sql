ALTER TABLE "collection"
ALTER COLUMN "artist_id" DROP NOT NULL;

ALTER TABLE "collection"
ADD COLUMN "user_id" INTEGER,
ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "collection_user_id_idx" ON "collection"("user_id");

ALTER TABLE "collection"
ADD CONSTRAINT "collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
