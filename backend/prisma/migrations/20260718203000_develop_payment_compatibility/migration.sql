-- Restore temporary display-only fields still used by the develop artwork
-- and admin screens. Stripe checkout and reconciliation remain exclusively
-- based on integer minor-unit fields such as price_amount and amount.

ALTER TABLE "artwork"
    ADD COLUMN IF NOT EXISTS "price_tokens" TEXT,
    ADD COLUMN IF NOT EXISTS "price" TEXT;

ALTER TABLE "order"
    ADD COLUMN IF NOT EXISTS "total_token" INTEGER;

ALTER TABLE "order_item"
    ADD COLUMN IF NOT EXISTS "price_tokens" TEXT;

ALTER TABLE "payment"
    ADD COLUMN IF NOT EXISTS "transaction_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "price" TEXT;
