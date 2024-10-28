-- CreateTable
CREATE TABLE "local_user_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "local_user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "local_user_credentials_user_id_key" ON "local_user_credentials"("user_id");

-- AddForeignKey
ALTER TABLE "local_user_credentials" ADD CONSTRAINT "local_user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
