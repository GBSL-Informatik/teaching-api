-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_author_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "groups_on_documents" DROP CONSTRAINT "groups_on_documents_document_id_fkey";

-- DropForeignKey
ALTER TABLE "groups_on_documents" DROP CONSTRAINT "groups_on_documents_group_id_fkey";

-- DropForeignKey
ALTER TABLE "users_on_groups" DROP CONSTRAINT "users_on_groups_group_id_fkey";

-- DropForeignKey
ALTER TABLE "users_on_groups" DROP CONSTRAINT "users_on_groups_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT,
ALTER COLUMN "last_name" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_on_groups" ADD CONSTRAINT "users_on_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_on_groups" ADD CONSTRAINT "users_on_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups_on_documents" ADD CONSTRAINT "groups_on_documents_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups_on_documents" ADD CONSTRAINT "groups_on_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
