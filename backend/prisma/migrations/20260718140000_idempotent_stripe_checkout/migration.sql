-- PAY-US-03 links a frozen cart version to one order, one local payment
-- operation and explicit inventory reservations.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "order") THEN
        RAISE EXCEPTION USING
            MESSAGE = 'PAY-US-03 cannot automatically attach existing orders to carts',
            HINT = 'Reconcile existing orders with their source cart before applying this migration.';
    END IF;
END $$;

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM (
    'ACTIVE',
    'CONSUMED',
    'RELEASED',
    'EXPIRED'
);

-- AlterTable
ALTER TABLE "order"
    ADD COLUMN "cart_id" INTEGER NOT NULL,
    ADD COLUMN "cart_version" INTEGER NOT NULL,
    ADD COLUMN "pricing_fingerprint" TEXT NOT NULL,
    ADD COLUMN "expires_at" TIMESTAMP(6) NOT NULL;

-- AlterTable
ALTER TABLE "payment"
    ALTER COLUMN "provider_payment_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "inventory_reservation" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "artwork_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservation_pkey" PRIMARY KEY ("id")
);

-- Integrity constraints
ALTER TABLE "order"
    ADD CONSTRAINT "order_cart_version_positive_check"
    CHECK ("cart_version" > 0),
    ADD CONSTRAINT "order_pricing_fingerprint_check"
    CHECK ("pricing_fingerprint" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "order_expiration_after_creation_check"
    CHECK ("expires_at" > "created_at");

ALTER TABLE "inventory_reservation"
    ADD CONSTRAINT "inventory_reservation_quantity_positive_check"
    CHECK ("quantity" > 0),
    ADD CONSTRAINT "inventory_reservation_expiration_after_creation_check"
    CHECK ("expires_at" > "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_cart_id_cart_version_key"
    ON "order"("cart_id", "cart_version");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservation_order_id_artwork_id_key"
    ON "inventory_reservation"("order_id", "artwork_id");

-- CreateIndex
CREATE INDEX "inventory_reservation_artwork_id_status_expires_at_idx"
    ON "inventory_reservation"("artwork_id", "status", "expires_at");

-- AddForeignKey
ALTER TABLE "order"
    ADD CONSTRAINT "order_cart_id_fkey"
    FOREIGN KEY ("cart_id") REFERENCES "cart"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation"
    ADD CONSTRAINT "inventory_reservation_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation"
    ADD CONSTRAINT "inventory_reservation_artwork_id_fkey"
    FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
