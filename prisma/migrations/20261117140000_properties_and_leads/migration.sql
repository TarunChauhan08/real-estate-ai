-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'INDEPENDENT_HOUSE', 'VILLA', 'BUILDER_FLOOR', 'PLOT', 'COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'ON_HOLD', 'SOLD', 'RENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PossessionStatus" AS ENUM ('READY_TO_MOVE', 'UNDER_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WHATSAPP', 'WEBSITE', 'PHONE_CALL', 'PORTAL', 'SOCIAL_MEDIA', 'REFERRAL', 'WALK_IN', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('UNSCORED', 'COLD', 'WARM', 'HOT');

-- CreateEnum
CREATE TYPE "LeadPurpose" AS ENUM ('SELF_USE', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "PurchaseTimeline" AS ENUM ('IMMEDIATE', 'ONE_TO_THREE_MONTHS', 'THREE_TO_SIX_MONTHS', 'SIX_PLUS_MONTHS', 'JUST_BROWSING');

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "project_name" VARCHAR(160),
    "property_type" "PropertyType" NOT NULL,
    "listing_type" "ListingType" NOT NULL DEFAULT 'SALE',
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "bedrooms" SMALLINT,
    "bathrooms" SMALLINT,
    "carpet_area_sqft" INTEGER,
    "price" BIGINT NOT NULL,
    "locality" VARCHAR(120),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "pincode" CHAR(6),
    "possession_status" "PossessionStatus",
    "possession_date" DATE,
    "rera_number" VARCHAR(60),
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "email" VARCHAR(254),
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'UNSCORED',
    "budget_min" BIGINT,
    "budget_max" BIGINT,
    "preferred_city" VARCHAR(100),
    "preferred_localities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_bedrooms" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "purpose" "LeadPurpose",
    "timeline" "PurchaseTimeline",
    "needs_home_loan" BOOLEAN,
    "preferred_language" VARCHAR(16),
    "notes" TEXT,
    "assigned_to_id" UUID,
    "last_contacted_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "properties_tenant_id_status_idx" ON "properties"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "properties_tenant_id_city_bedrooms_idx" ON "properties"("tenant_id", "city", "bedrooms");

-- CreateIndex
CREATE INDEX "properties_tenant_id_price_idx" ON "properties"("tenant_id", "price");

-- CreateIndex
CREATE INDEX "properties_tenant_id_created_at_idx" ON "properties"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "leads_tenant_id_phone_key" ON "leads"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leads_tenant_id_temperature_idx" ON "leads"("tenant_id", "temperature");

-- CreateIndex
CREATE INDEX "leads_tenant_id_assigned_to_id_idx" ON "leads"("tenant_id", "assigned_to_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_created_at_idx" ON "leads"("tenant_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written safety nets. Prisma cannot express CHECK constraints, so they live here;
-- later `prisma migrate dev` runs keep them because they do not appear in schema.prisma.
ALTER TABLE "properties" ADD CONSTRAINT "properties_price_positive" CHECK ("price" > 0);
ALTER TABLE "properties" ADD CONSTRAINT "properties_bedrooms_range" CHECK ("bedrooms" IS NULL OR "bedrooms" BETWEEN 0 AND 20);
ALTER TABLE "leads" ADD CONSTRAINT "leads_budget_order" CHECK ("budget_min" IS NULL OR "budget_max" IS NULL OR "budget_min" <= "budget_max");
ALTER TABLE "leads" ADD CONSTRAINT "leads_phone_e164" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$');
