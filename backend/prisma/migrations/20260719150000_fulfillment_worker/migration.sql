-- PAY-US-17 makes fulfillment tasks claimable, retryable and recoverable
-- across multiple backend instances without coupling delivery to webhooks.

ALTER TABLE "fulfillment_task"
    ADD COLUMN "available_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "locked_at" TIMESTAMP(6),
    ADD COLUMN "lease_token" TEXT,
    ADD COLUMN "last_error_code" TEXT,
    ADD COLUMN "effect_reference" TEXT;

CREATE INDEX "fulfillment_task_status_available_at_idx"
    ON "fulfillment_task"("status", "available_at");
