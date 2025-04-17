-- AlterTable
ALTER TABLE "_StudentGroupToUser" ADD CONSTRAINT "_StudentGroupToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_StudentGroupToUser_AB_unique";
