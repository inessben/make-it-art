-- PAY-US-17 durable, idempotent delivery effects. Every order item has at
-- most one entitlement and certificate, so a crashed outbox task is replayable.

CREATE TYPE "DigitalDeliveryStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "digital_entitlement" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "artwork_id" INTEGER NOT NULL,
    "status" "DigitalDeliveryStatus" NOT NULL DEFAULT 'ACTIVE',
    "source_task_key" TEXT NOT NULL,
    "granted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspended_at" TIMESTAMP(6),
    "revoked_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "digital_entitlement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "digital_entitlement_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE,
    CONSTRAINT "digital_entitlement_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE,
    CONSTRAINT "digital_entitlement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
    CONSTRAINT "digital_entitlement_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "digital_entitlement_order_item_id_key" ON "digital_entitlement"("order_item_id");
CREATE INDEX "digital_entitlement_user_id_status_idx" ON "digital_entitlement"("user_id", "status");
CREATE INDEX "digital_entitlement_order_id_status_idx" ON "digital_entitlement"("order_id", "status");

CREATE TABLE "ownership_certificate" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificate_number" TEXT NOT NULL,
    "order_id" INTEGER NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "artwork_id" INTEGER NOT NULL,
    "status" "DigitalDeliveryStatus" NOT NULL DEFAULT 'ACTIVE',
    "snapshot" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "issued_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspended_at" TIMESTAMP(6),
    "revoked_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ownership_certificate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ownership_certificate_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE,
    CONSTRAINT "ownership_certificate_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE,
    CONSTRAINT "ownership_certificate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
    CONSTRAINT "ownership_certificate_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "ownership_certificate_public_id_key" ON "ownership_certificate"("public_id");
CREATE UNIQUE INDEX "ownership_certificate_certificate_number_key" ON "ownership_certificate"("certificate_number");
CREATE UNIQUE INDEX "ownership_certificate_order_item_id_key" ON "ownership_certificate"("order_item_id");
CREATE INDEX "ownership_certificate_user_id_status_idx" ON "ownership_certificate"("user_id", "status");
CREATE INDEX "ownership_certificate_order_id_status_idx" ON "ownership_certificate"("order_id", "status");
