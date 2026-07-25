ALTER TABLE "order"
ADD CONSTRAINT "order_launch_market_snapshot_check"
CHECK (
    "tax_behavior" = 'LEGACY_EXCLUSIVE'
    OR (
        "tax_behavior" = 'INCLUSIVE'
        AND "customer_type" = 'B2C'
        AND "market_country" = 'FR'
        AND "billing_snapshot" IS NOT NULL
        AND "billing_snapshot"->>'customerType' = 'B2C'
        AND "billing_snapshot"->'address'->>'country' = 'FR'
    )
);
