-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Access" AS ENUM ('RO', 'RW', 'None');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "parent_id" UUID,
    "document_root_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_roots" (
    "id" UUID NOT NULL,
    "access" "Access" NOT NULL DEFAULT 'RW',

    CONSTRAINT "document_roots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_group_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "access" "Access" NOT NULL,
    "student_group_id" UUID NOT NULL,
    "document_root_id" UUID NOT NULL,

    CONSTRAINT "root_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_user_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "access" "Access" NOT NULL,
    "user_id" UUID NOT NULL,
    "document_root_id" UUID NOT NULL,

    CONSTRAINT "root_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "_StudentGroupToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "sessions"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "_StudentGroupToUser_AB_unique" ON "_StudentGroupToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_StudentGroupToUser_B_index" ON "_StudentGroupToUser"("B");

-- AddForeignKey
ALTER TABLE "student_groups" ADD CONSTRAINT "student_groups_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "student_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_root_id_fkey" FOREIGN KEY ("document_root_id") REFERENCES "document_roots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_group_permissions" ADD CONSTRAINT "root_group_permissions_student_group_id_fkey" FOREIGN KEY ("student_group_id") REFERENCES "student_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_group_permissions" ADD CONSTRAINT "root_group_permissions_document_root_id_fkey" FOREIGN KEY ("document_root_id") REFERENCES "document_roots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_user_permissions" ADD CONSTRAINT "root_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_user_permissions" ADD CONSTRAINT "root_user_permissions_document_root_id_fkey" FOREIGN KEY ("document_root_id") REFERENCES "document_roots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentGroupToUser" ADD CONSTRAINT "_StudentGroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "student_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentGroupToUser" ADD CONSTRAINT "_StudentGroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
