-- CreateTable
CREATE TABLE "ai_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "rate_limit" INTEGER NOT NULL DEFAULT 0,
    "rate_limit_period_ms" BIGINT NOT NULL DEFAULT 3600000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "api_key" TEXT NOT NULL,
    "api_url" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ai_template_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "status_code" INTEGER,
    "request" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_templates" ADD CONSTRAINT "ai_templates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_ai_template_id_fkey" FOREIGN KEY ("ai_template_id") REFERENCES "ai_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
