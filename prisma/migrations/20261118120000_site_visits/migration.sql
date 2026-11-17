-- CreateEnum
CREATE TYPE "SiteVisitStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "site_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "property_id" UUID,
    "conversation_id" UUID,
    "status" "SiteVisitStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduled_at" TIMESTAMPTZ(3),
    "requested_slot" VARCHAR(120),
    "notes" TEXT,
    "assigned_to_id" UUID,
    "reminder_sent_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_visits_tenant_id_status_scheduled_at_idx" ON "site_visits"("tenant_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "site_visits_tenant_id_lead_id_idx" ON "site_visits"("tenant_id", "lead_id");

-- CreateIndex
CREATE INDEX "site_visits_status_scheduled_at_idx" ON "site_visits"("status", "scheduled_at");

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written safety net (not expressible in schema.prisma): a confirmed visit always has a time.
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_confirmed_has_time" CHECK ("status" <> 'CONFIRMED' OR "scheduled_at" IS NOT NULL);
