/*
  Warnings:

  - You are about to drop the `ai_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_requests" DROP CONSTRAINT "ai_requests_ai_template_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_requests" DROP CONSTRAINT "ai_requests_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_templates" DROP CONSTRAINT "ai_templates_author_id_fkey";

-- DropTable
DROP TABLE "ai_requests";

-- DropTable
DROP TABLE "ai_templates";
