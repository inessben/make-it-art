ALTER TABLE "order_item"
    DROP CONSTRAINT "order_item_artwork_id_fkey";

ALTER TABLE "order_item"
    ALTER COLUMN "artwork_id" DROP NOT NULL;

ALTER TABLE "order_item"
    ADD CONSTRAINT "order_item_artwork_id_fkey"
    FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
