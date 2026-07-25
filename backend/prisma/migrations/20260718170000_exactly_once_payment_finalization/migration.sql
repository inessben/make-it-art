-- PAY-US-06 stores financial transitions, operator alerts and replayable
-- fulfillment tasks. No card or bank data is persisted in these tables.

CREATE TYPE "FulfillmentTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "financial_transition" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "payment_id" INTEGER,
    "stripe_event_id" TEXT NOT NULL,
    "stripe_object_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "previous_status" TEXT NOT NULL,
    "next_status" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_transition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fulfillment_task" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "task_type" TEXT NOT NULL,
    "task_key" TEXT NOT NULL,
    "status" "FulfillmentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(6),
    CONSTRAINT "fulfillment_task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_operator_alert" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "payment_id" INTEGER,
    "stripe_event_id" TEXT NOT NULL,
    "stripe_object_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(6),
    CONSTRAINT "payment_operator_alert_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "fulfillment_task"
    ADD CONSTRAINT "fulfillment_task_attempt_count_non_negative_check"
    CHECK ("attempt_count" >= 0);

CREATE UNIQUE INDEX "financial_transition_event_entity_status_key"
    ON "financial_transition"("stripe_event_id", "entity_type", "previous_status", "next_status");
CREATE INDEX "financial_transition_order_id_created_at_idx"
    ON "financial_transition"("order_id", "created_at");
CREATE UNIQUE INDEX "fulfillment_task_task_key_key" ON "fulfillment_task"("task_key");
CREATE INDEX "fulfillment_task_status_created_at_idx"
    ON "fulfillment_task"("status", "created_at");
CREATE UNIQUE INDEX "payment_operator_alert_event_code_key"
    ON "payment_operator_alert"("stripe_event_id", "code");
CREATE INDEX "payment_operator_alert_status_created_at_idx"
    ON "payment_operator_alert"("status", "created_at");

ALTER TABLE "financial_transition"
    ADD CONSTRAINT "financial_transition_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "financial_transition_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fulfillment_task"
    ADD CONSTRAINT "fulfillment_task_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_operator_alert"
    ADD CONSTRAINT "payment_operator_alert_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "payment_operator_alert_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
