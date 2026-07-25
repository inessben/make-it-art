-- Existing orders predate the France B2C snapshot. Keep their historical
-- exclusive-tax interpretation explicit instead of rewriting financial data.
UPDATE "order"
SET
    "customer_type" = 'LEGACY',
    "market_country" = 'UNKNOWN',
    "tax_behavior" = 'LEGACY_EXCLUSIVE',
    "commission_rate_bps" = 0
WHERE "billing_snapshot" IS NULL;

UPDATE "order_item"
SET "commission_rate_bps" = 0
WHERE "order_id" IN (
    SELECT "id"
    FROM "order"
    WHERE "tax_behavior" = 'LEGACY_EXCLUSIVE'
);

ALTER TABLE "order"
DROP CONSTRAINT "order_total_matches_components_check";

ALTER TABLE "order"
ADD CONSTRAINT "order_commerce_amounts_non_negative_check"
CHECK (
    "subtotal_amount" >= 0
    AND "discount_amount" >= 0
    AND "discount_amount" <= "subtotal_amount"
    AND "subtotal_excluding_tax_amount" >= 0
    AND "tax_amount" >= 0
    AND "total_amount" > 0
    AND "commission_amount" >= 0
),
ADD CONSTRAINT "order_inclusive_tax_totals_check"
CHECK (
    "tax_behavior" = 'LEGACY_EXCLUSIVE'
    OR (
        "tax_behavior" = 'INCLUSIVE'
        AND "total_amount" = "subtotal_amount" - "discount_amount"
        AND "total_amount" = "subtotal_excluding_tax_amount" + "tax_amount"
    )
),
ADD CONSTRAINT "order_tax_rate_check"
CHECK ("tax_rate_bps" >= 0 AND "tax_rate_bps" <= 10000),
ADD CONSTRAINT "order_commission_rate_check"
CHECK ("commission_rate_bps" >= 0 AND "commission_rate_bps" <= 10000),
ADD CONSTRAINT "order_commission_basis_check"
CHECK (
    "tax_behavior" = 'LEGACY_EXCLUSIVE'
    OR "commission_amount" <= "subtotal_excluding_tax_amount"
);

ALTER TABLE "order_item"
ADD CONSTRAINT "order_item_commerce_amounts_non_negative_check"
CHECK (
    "discount_amount" >= 0
    AND "discount_amount" <= "subtotal_amount"
    AND "net_amount" >= 0
    AND "tax_amount" >= 0
    AND "commission_amount" >= 0
),
ADD CONSTRAINT "order_item_inclusive_tax_totals_check"
CHECK (
    (
        "net_amount" = 0
        AND "tax_amount" = 0
        AND "tax_rate_bps" = 0
    )
    OR "subtotal_amount" - "discount_amount" = "net_amount" + "tax_amount"
),
ADD CONSTRAINT "order_item_tax_rate_check"
CHECK ("tax_rate_bps" >= 0 AND "tax_rate_bps" <= 10000),
ADD CONSTRAINT "order_item_commission_rate_check"
CHECK ("commission_rate_bps" >= 0 AND "commission_rate_bps" <= 10000),
ADD CONSTRAINT "order_item_commission_basis_check"
CHECK ("net_amount" = 0 OR "commission_amount" <= "net_amount");
