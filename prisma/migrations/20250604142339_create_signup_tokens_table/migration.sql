-- CreateTable
CREATE TABLE "signup_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "method" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "valid_through" TIMESTAMP(3),
    "uses" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_signup_token_student_groups" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_signup_token_student_groups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_signup_token_student_groups_B_index" ON "_signup_token_student_groups"("B");

-- AddForeignKey
ALTER TABLE "_signup_token_student_groups" ADD CONSTRAINT "_signup_token_student_groups_A_fkey" FOREIGN KEY ("A") REFERENCES "signup_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_signup_token_student_groups" ADD CONSTRAINT "_signup_token_student_groups_B_fkey" FOREIGN KEY ("B") REFERENCES "student_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
