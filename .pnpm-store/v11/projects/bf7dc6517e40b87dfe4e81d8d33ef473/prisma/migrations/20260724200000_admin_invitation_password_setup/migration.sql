ALTER TABLE "password_reset_token"
ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'reset';
