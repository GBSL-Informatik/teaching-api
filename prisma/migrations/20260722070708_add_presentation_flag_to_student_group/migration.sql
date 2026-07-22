-- AlterTable
ALTER TABLE "student_groups" ADD COLUMN     "can_present" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "presented_document" JSONB;
