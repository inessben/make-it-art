ALTER TABLE "user"
    ADD COLUMN "stripe_customer_id" TEXT;

CREATE UNIQUE INDEX "user_stripe_customer_id_key"
    ON "user"("stripe_customer_id");

CREATE TABLE "saved_payment_method_consent" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "provider_payment_method_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'FUTURE_ON_SESSION_PURCHASES',
    "terms_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_payment_method_consent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saved_payment_method_consent_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_payment_method_consent_payment_id_fkey"
        FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "saved_payment_method_consent_user_id_provider_payment_method_id_key"
    ON "saved_payment_method_consent"("user_id", "provider_payment_method_id");

CREATE INDEX "saved_payment_method_consent_user_id_revoked_at_idx"
    ON "saved_payment_method_consent"("user_id", "revoked_at");
