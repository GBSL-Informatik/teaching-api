-- CreateTable
CREATE TABLE "AllowedAction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "AllowedAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedAction_document_type_action_key" ON "AllowedAction"("document_type", "action");
