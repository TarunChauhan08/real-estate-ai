-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "last_buyer_message_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "delivery_error" VARCHAR(300),
ADD COLUMN     "delivery_status" "MessageDeliveryStatus",
ADD COLUMN     "external_id" VARCHAR(128);

-- CreateTable
CREATE TABLE "whatsapp_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "phone_number_id" VARCHAR(32) NOT NULL,
    "waba_id" VARCHAR(32),
    "display_phone_number" VARCHAR(16) NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "last_inbound_at" TIMESTAMPTZ(3),
    "connected_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_accounts_tenant_id_key" ON "whatsapp_accounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_accounts_phone_number_id_key" ON "whatsapp_accounts"("phone_number_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_tenant_id_external_id_key" ON "messages"("tenant_id", "external_id");

-- AddForeignKey
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
