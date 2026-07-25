-- PAY-US-02 adds a server-owned cart and explicit inventory counters.

-- CreateEnum
CREATE TYPE "ArtworkSaleStatus" AS ENUM (
    'DRAFT',
    'AVAILABLE',
    'SOLD_OUT',
    'UNLISTED'
);

-- AlterTable
ALTER TABLE "artwork"
    ADD COLUMN "sale_status" "ArtworkSaleStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "reserved_quantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cart" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "artwork_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- Integrity constraints
ALTER TABLE "artwork"
    ADD CONSTRAINT "artwork_stock_quantity_non_negative_check"
    CHECK ("stock_quantity" >= 0),
    ADD CONSTRAINT "artwork_reserved_quantity_check"
    CHECK (
        "reserved_quantity" >= 0
        AND "reserved_quantity" <= "stock_quantity"
    );

ALTER TABLE "cart"
    ADD CONSTRAINT "cart_version_positive_check"
    CHECK ("version" > 0);

ALTER TABLE "cart_item"
    ADD CONSTRAINT "cart_item_quantity_positive_check"
    CHECK ("quantity" > 0);

-- CreateIndex
CREATE UNIQUE INDEX "cart_user_id_key" ON "cart"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cart_id_artwork_id_key"
    ON "cart_item"("cart_id", "artwork_id");

-- CreateIndex
CREATE INDEX "cart_item_artwork_id_idx" ON "cart_item"("artwork_id");

-- AddForeignKey
ALTER TABLE "cart"
    ADD CONSTRAINT "cart_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item"
    ADD CONSTRAINT "cart_item_cart_id_fkey"
    FOREIGN KEY ("cart_id") REFERENCES "cart"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item"
    ADD CONSTRAINT "cart_item_artwork_id_fkey"
    FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
