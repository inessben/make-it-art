CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'COMMISSION');

ALTER TABLE "order"
ADD COLUMN "customer_type" TEXT NOT NULL DEFAULT 'B2C',
ADD COLUMN "market_country" TEXT NOT NULL DEFAULT 'FR',
ADD COLUMN "billing_snapshot" JSONB,
ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "subtotal_excluding_tax_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_behavior" TEXT NOT NULL DEFAULT 'INCLUSIVE',
ADD COLUMN "commission_rate_bps" INTEGER NOT NULL DEFAULT 700;

ALTER TABLE "order_item"
ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "net_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "commission_rate_bps" INTEGER NOT NULL DEFAULT 700;

CREATE TABLE "invoice_sequence" (
    "key" TEXT NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_sequence_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "order_id" INTEGER NOT NULL,
    "recipient_reference" TEXT NOT NULL,
    "issuer_snapshot" JSONB NOT NULL,
    "recipient_snapshot" JSONB NOT NULL,
    "line_items" JSONB NOT NULL,
    "subtotal_amount" INTEGER NOT NULL,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,
    "tax_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "fingerprint" TEXT NOT NULL,
    "issued_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdf" BYTEA,
    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_public_id_key" ON "invoice"("public_id");
CREATE UNIQUE INDEX "invoice_number_key" ON "invoice"("number");
CREATE UNIQUE INDEX "invoice_order_id_type_recipient_reference_key"
ON "invoice"("order_id", "type", "recipient_reference");
CREATE INDEX "invoice_order_id_type_idx" ON "invoice"("order_id", "type");

ALTER TABLE "invoice"
ADD CONSTRAINT "invoice_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
