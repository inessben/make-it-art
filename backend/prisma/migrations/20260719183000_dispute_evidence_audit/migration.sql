-- Evidence contents stay in Stripe. This ledger stores only the operator,
-- provider status and opaque Stripe file references returned by the API.

CREATE TABLE "dispute_evidence_audit" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "captured_by_user_id" INTEGER NOT NULL,
    "provider_status" TEXT NOT NULL,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "has_evidence" BOOLEAN NOT NULL DEFAULT false,
    "file_references" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "captured_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispute_evidence_audit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dispute_evidence_submission_count_non_negative" CHECK ("submission_count" >= 0),
    CONSTRAINT "dispute_evidence_audit_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "dispute"("id") ON DELETE CASCADE,
    CONSTRAINT "dispute_evidence_audit_captured_by_user_id_fkey" FOREIGN KEY ("captured_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT
);

CREATE INDEX "dispute_evidence_audit_dispute_id_captured_at_idx"
    ON "dispute_evidence_audit"("dispute_id", "captured_at");
