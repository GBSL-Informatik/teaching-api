-- AlterTable
ALTER TABLE "documents"
    ADD COLUMN     "uniq_on_root_constraint" TEXT COLLATE "C",
    ADD COLUMN     "uniq_on_parent_constraint" TEXT COLLATE "C";

ALTER TABLE "documents"
  ADD CONSTRAINT unique_on_root_constraint UNIQUE (document_root_id, author_id, type, uniq_on_root_constraint);

ALTER TABLE "documents"
  ADD CONSTRAINT unique_on_parent_constraint UNIQUE (document_root_id, author_id, type, parent_id, uniq_on_parent_constraint);
