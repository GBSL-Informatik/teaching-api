-- AlterTable
ALTER TABLE "cms_settings" ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "token" TEXT,
ADD COLUMN     "token_expires_at" TIMESTAMP(3);
