ALTER TABLE "artist_application_draft"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN "submitted_at" TIMESTAMP(3),
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_admin_id" INTEGER,
ADD COLUMN "review_note" TEXT,
ADD COLUMN "contract_accepted_at" TIMESTAMP(3),
ADD COLUMN "contract_signed_at" TIMESTAMP(3),
ADD COLUMN "contract_version" TEXT,
ADD COLUMN "signature_data_url" TEXT,
ADD COLUMN "contract_pdf" BYTEA;

ALTER TABLE "artist_application_draft"
ADD CONSTRAINT "artist_application_draft_reviewed_by_admin_id_fkey"
FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "user"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
