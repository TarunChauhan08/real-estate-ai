-- Business deletion requests: purged after a grace period unless cancelled.
ALTER TABLE "tenants" ADD COLUMN "deletion_scheduled_at" TIMESTAMPTZ(3);
ALTER TABLE "tenants" ADD COLUMN "deletion_requested_by_id" UUID;

CREATE INDEX "tenants_deletion_scheduled_at_idx" ON "tenants"("deletion_scheduled_at");
