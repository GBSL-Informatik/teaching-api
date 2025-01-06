-- CreateTable
CREATE TABLE "allowed_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "allowed_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_actions_document_type_action_key" ON "allowed_actions"("document_type", "action");

INSERT INTO "allowed_actions"
    ("document_type", "action") 
VALUES
    ('dir', 'update@parent_id'),
    ('file', 'update@parent_id');