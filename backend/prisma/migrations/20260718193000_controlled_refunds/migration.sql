-- PAY-US-09 persists refund requests before calling Stripe, then applies the
-- financial result only from signed refund webhooks.

ALTER TYPE "FulfillmentTaskStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "refund" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" INTEGER NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "requested_by_user_id" INTEGER NOT NULL,
    "provider_refund_id" TEXT,
    "provider_status" TEXT,
    "provider_reference" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason_code" TEXT NOT NULL,
    "failure_code" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "succeeded_at" TIMESTAMP(6),
    "failed_at" TIMESTAMP(6),
    CONSTRAINT "refund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refund_amount_positive_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "refund_public_id_key" ON "refund"("public_id");
CREATE UNIQUE INDEX "refund_provider_refund_id_key" ON "refund"("provider_refund_id");
CREATE UNIQUE INDEX "refund_idempotency_key_key" ON "refund"("idempotency_key");
CREATE INDEX "refund_order_id_created_at_idx" ON "refund"("order_id", "created_at");
CREATE INDEX "refund_payment_id_status_idx" ON "refund"("payment_id", "status");

ALTER TABLE "stripe_webhook_event" ADD COLUMN "refund_id" INTEGER;

ALTER TABLE "refund"
    ADD CONSTRAINT "refund_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "refund_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "refund_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stripe_webhook_event"
    ADD CONSTRAINT "stripe_webhook_event_refund_id_fkey"
    FOREIGN KEY ("refund_id") REFERENCES "refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
