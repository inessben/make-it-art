-- PAY-US-19 keeps disputes distinct from voluntary refunds and links every
-- webhook to a persisted Charge or PaymentIntent.

CREATE TYPE "DisputeStatus" AS ENUM (
    'NEEDS_RESPONSE',
    'UNDER_REVIEW',
    'WON',
    'LOST',
    'CLOSED'
);

ALTER TABLE "payment"
    ADD COLUMN "provider_charge_id" TEXT;

CREATE UNIQUE INDEX "payment_provider_charge_id_key"
    ON "payment"("provider_charge_id");

CREATE TABLE "dispute" (
    "id" SERIAL NOT NULL,
    "provider_dispute_id" TEXT NOT NULL,
    "provider_charge_id" TEXT NOT NULL,
    "order_id" INTEGER NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "status" "DisputeStatus" NOT NULL,
    "provider_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "evidence_due_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(6),
    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dispute_amount_positive" CHECK ("amount" > 0),
    CONSTRAINT "dispute_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE,
    CONSTRAINT "dispute_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "dispute_provider_dispute_id_key"
    ON "dispute"("provider_dispute_id");
CREATE INDEX "dispute_status_evidence_due_at_idx"
    ON "dispute"("status", "evidence_due_at");
CREATE INDEX "dispute_order_id_created_at_idx"
    ON "dispute"("order_id", "created_at");
CREATE INDEX "dispute_payment_id_status_idx"
    ON "dispute"("payment_id", "status");

ALTER TABLE "stripe_webhook_event"
    ADD COLUMN "dispute_id" INTEGER;
ALTER TABLE "stripe_webhook_event"
    ADD CONSTRAINT "stripe_webhook_event_dispute_id_fkey"
    FOREIGN KEY ("dispute_id") REFERENCES "dispute"("id") ON DELETE SET NULL;
