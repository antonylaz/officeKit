-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarding_expires_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_token" TEXT,
ADD COLUMN     "two_fa_recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "two_fa_secret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_onboarding_token_key" ON "users"("onboarding_token");

