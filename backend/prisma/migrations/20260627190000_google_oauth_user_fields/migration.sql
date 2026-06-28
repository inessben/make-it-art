ALTER TABLE "user"
ADD COLUMN "oauth_provider" TEXT,
ADD COLUMN "oauth_subject" TEXT,
ADD COLUMN "oauth_linked_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "user_oauth_provider_oauth_subject_key"
ON "user"("oauth_provider", "oauth_subject");
