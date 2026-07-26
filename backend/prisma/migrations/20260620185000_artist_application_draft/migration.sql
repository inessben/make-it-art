-- CreateTable
CREATE TABLE "artist_application_draft" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "completed_at" TIMESTAMP(3),
    "last_reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_application_draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artist_application_draft_user_id_key" ON "artist_application_draft"("user_id");

-- AddForeignKey
ALTER TABLE "artist_application_draft" ADD CONSTRAINT "artist_application_draft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
