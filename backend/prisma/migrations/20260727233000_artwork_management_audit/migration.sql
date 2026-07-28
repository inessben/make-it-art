ALTER TABLE "audit_logs"
ADD COLUMN "correlation_id" VARCHAR(64),
ADD COLUMN "metadata" JSONB;

CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx"
ON "audit_logs"("entity_type", "entity_id", "created_at");

CREATE INDEX "audit_logs_correlation_id_idx"
ON "audit_logs"("correlation_id");
