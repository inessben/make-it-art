ALTER TABLE "order_item"
ADD CONSTRAINT "order_item_inclusive_tax_calculation_check"
CHECK (
    (
        "net_amount" = 0
        AND "tax_amount" = 0
        AND "tax_rate_bps" = 0
    )
    OR "net_amount" = ROUND(
        (("subtotal_amount" - "discount_amount")::numeric * 10000)
        / (10000 + "tax_rate_bps")
    )::integer
),
ADD CONSTRAINT "order_item_commission_calculation_check"
CHECK (
    "net_amount" = 0
    OR "commission_amount" = (
        (("net_amount"::bigint * "commission_rate_bps") + 5000) / 10000
    )::integer
);
