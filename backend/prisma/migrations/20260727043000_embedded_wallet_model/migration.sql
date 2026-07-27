CREATE TYPE "wallet_provider" AS ENUM ('COINBASE_CDP', 'LEGACY_IMPORT');

CREATE TYPE "wallet_network" AS ENUM ('BASE', 'UNKNOWN');

CREATE TYPE "wallet_origin" AS ENUM ('EMBEDDED', 'EXTERNAL', 'LEGACY');

CREATE TYPE "wallet_status" AS ENUM (
  'PENDING',
  'ACTIVE',
  'FAILED',
  'RETRY_REQUIRED',
  'DETACHED',
  'UNVERIFIED'
);

CREATE TABLE "wallet" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "address" TEXT,
  "provider_wallet_id" TEXT,
  "provider" "wallet_provider" NOT NULL,
  "network" "wallet_network" NOT NULL,
  "origin" "wallet_origin" NOT NULL,
  "status" "wallet_status" NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "consented_at" TIMESTAMP(6),
  "last_error_code" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "detached_at" TIMESTAMP(6),
  CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_consent" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "accepted" BOOLEAN NOT NULL,
  "consent_version" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(6),
  CONSTRAINT "wallet_consent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_idempotency_key_key" ON "wallet"("idempotency_key");
CREATE UNIQUE INDEX "wallet_provider_provider_wallet_id_key" ON "wallet"("provider", "provider_wallet_id");
CREATE UNIQUE INDEX "wallet_network_address_key" ON "wallet"("network", "address");
CREATE INDEX "wallet_user_id_status_idx" ON "wallet"("user_id", "status");
CREATE INDEX "wallet_consent_user_id_created_at_idx" ON "wallet_consent"("user_id", "created_at");

ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "wallet_consent" ADD CONSTRAINT "wallet_consent_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

INSERT INTO "wallet" (
  "user_id", "address", "provider", "network", "origin", "status",
  "idempotency_key", "created_at", "updated_at"
)
SELECT
  "id",
  LOWER(TRIM("wallet_addresse")),
  'LEGACY_IMPORT'::"wallet_provider",
  'UNKNOWN'::"wallet_network",
  'LEGACY'::"wallet_origin",
  'UNVERIFIED'::"wallet_status",
  'legacy:user:' || "id"::TEXT,
  COALESCE("created_at", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "user"
WHERE NULLIF(TRIM("wallet_addresse"), '') IS NOT NULL;