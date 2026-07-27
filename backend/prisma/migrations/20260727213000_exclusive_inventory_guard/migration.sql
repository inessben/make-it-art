ALTER TABLE "artwork"
    ADD CONSTRAINT "artwork_exclusive_inventory_check"
    CHECK (
        "license_type" <> 'EXCLUSIVE'
        OR (
            "stock_quantity" BETWEEN 0 AND 1
            AND "reserved_quantity" BETWEEN 0 AND 1
        )
    );
