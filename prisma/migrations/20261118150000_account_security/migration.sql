-- CreateEnum
CREATE TYPE "UserTokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "user_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "UserTokenPurpose" NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_token_hash_key" ON "user_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "user_tokens_user_id_purpose_idx" ON "user_tokens"("user_id", "purpose");

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
