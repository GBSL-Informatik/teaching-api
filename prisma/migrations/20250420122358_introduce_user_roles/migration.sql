-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'STUDENT';
UPDATE "users" SET "role" = 'ADMIN' WHERE "is_admin" = true;
ALTER TABLE "users" DROP COLUMN "is_admin";
