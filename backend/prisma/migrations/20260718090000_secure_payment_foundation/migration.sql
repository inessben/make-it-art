-- PAY-US-01 adds an explicit fiat model. Legacy display columns are retained
-- temporarily for develop compatibility, but are never authoritative for a
-- Stripe amount. Refuse to guess the meaning of existing order/payment data.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "order")
       OR EXISTS (SELECT 1 FROM "order_item")
       OR EXISTS (SELECT 1 FROM "payment") THEN
        RAISE EXCEPTION USING
            MESSAGE = 'PAY-US-01 cannot automatically convert legacy financial data',
            HINT = 'Reconcile legacy token/string amounts to integer EUR cents before applying this migration.';
    END IF;
END $$;

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM (
    'PENDING_PAYMENT',
    'PAYMENT_PROCESSING',
    'PAYMENT_FAILED',
    'PAYMENT_REVIEW',
    'PAID',
    'CANCELED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
);

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'CANCELED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
);

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "artwork"
    ADD COLUMN "price_amount" INTEGER,
    ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "order"
    DROP COLUMN "status",
    ADD COLUMN "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    ADD COLUMN "checkout_version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "subtotal_amount" INTEGER NOT NULL,
    ADD COLUMN "tax_amount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "fee_amount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "commission_amount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "total_amount" INTEGER NOT NULL,
    ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR',
    ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "paid_at" TIMESTAMP(6),
    ADD COLUMN "canceled_at" TIMESTAMP(6),
    ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
    ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_item"
    ADD COLUMN "artwork_title" TEXT NOT NULL,
    ADD COLUMN "artist_name" TEXT NOT NULL,
    ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "unit_amount" INTEGER NOT NULL,
    ADD COLUMN "subtotal_amount" INTEGER NOT NULL,
    ADD COLUMN "commission_amount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR',
    ADD COLUMN "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "payment"
    DROP COLUMN "status",
    ADD COLUMN "checkout_version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    ADD COLUMN "provider_payment_id" TEXT NOT NULL,
    ADD COLUMN "provider_status" TEXT,
    ADD COLUMN "idempotency_key" TEXT,
    ADD COLUMN "amount" INTEGER NOT NULL,
    ADD COLUMN "refunded_amount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR',
    ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "failure_code" TEXT,
    ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "succeeded_at" TIMESTAMP(6),
    ADD COLUMN "failed_at" TIMESTAMP(6),
    ADD COLUMN "canceled_at" TIMESTAMP(6),
    ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
    ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "created_at" SET NOT NULL;

-- CreateTable
CREATE TABLE "stripe_webhook_event" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "stripe_object_id" TEXT,
    "payment_id" INTEGER,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(6),

    CONSTRAINT "stripe_webhook_event_pkey" PRIMARY KEY ("id")
);

-- Financial integrity constraints
ALTER TABLE "artwork"
    ADD CONSTRAINT "artwork_price_amount_non_negative_check"
    CHECK ("price_amount" IS NULL OR "price_amount" >= 0);

ALTER TABLE "order"
    ADD CONSTRAINT "order_checkout_version_positive_check"
    CHECK ("checkout_version" > 0),
    ADD CONSTRAINT "order_amounts_non_negative_check"
    CHECK (
        "subtotal_amount" >= 0
        AND "tax_amount" >= 0
        AND "fee_amount" >= 0
        AND "commission_amount" >= 0
        AND "total_amount" >= 0
    ),
    ADD CONSTRAINT "order_commission_within_subtotal_check"
    CHECK ("commission_amount" <= "subtotal_amount"),
    ADD CONSTRAINT "order_total_matches_components_check"
    CHECK ("total_amount" = "subtotal_amount" + "tax_amount" + "fee_amount");

ALTER TABLE "order_item"
    ADD CONSTRAINT "order_item_quantity_positive_check"
    CHECK ("quantity" > 0),
    ADD CONSTRAINT "order_item_amounts_non_negative_check"
    CHECK (
        "unit_amount" >= 0
        AND "subtotal_amount" >= 0
        AND "commission_amount" >= 0
    ),
    ADD CONSTRAINT "order_item_subtotal_check"
    CHECK ("subtotal_amount" = "unit_amount" * "quantity"),
    ADD CONSTRAINT "order_item_commission_within_subtotal_check"
    CHECK ("commission_amount" <= "subtotal_amount");

ALTER TABLE "payment"
    ADD CONSTRAINT "payment_checkout_version_positive_check"
    CHECK ("checkout_version" > 0),
    ADD CONSTRAINT "payment_amount_positive_check"
    CHECK ("amount" > 0),
    ADD CONSTRAINT "payment_refunded_amount_check"
    CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "amount");

ALTER TABLE "stripe_webhook_event"
    ADD CONSTRAINT "stripe_webhook_event_attempt_count_non_negative_check"
    CHECK ("attempt_count" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "order_public_id_key" ON "order"("public_id");

-- CreateIndex
CREATE INDEX "order_user_id_status_idx" ON "order"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_order_id_artwork_id_key"
    ON "order_item"("order_id", "artwork_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_payment_id_key"
    ON "payment"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_idempotency_key_key"
    ON "payment"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_order_id_checkout_version_key"
    ON "payment"("order_id", "checkout_version");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_event_event_id_key"
    ON "stripe_webhook_event"("event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_event_stripe_object_id_event_type_idx"
    ON "stripe_webhook_event"("stripe_object_id", "event_type");

-- AddForeignKey
ALTER TABLE "stripe_webhook_event"
    ADD CONSTRAINT "stripe_webhook_event_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
