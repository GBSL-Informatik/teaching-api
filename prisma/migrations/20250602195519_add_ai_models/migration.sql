-- CreateTable
CREATE TABLE "ai_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT '',
    "rate_limit" INTEGER NOT NULL DEFAULT 0,
    "rate_limit_period_ms" BIGINT NOT NULL DEFAULT 3600000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_url" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "max_tokens" INTEGER NOT NULL DEFAULT 2048,
    "top_p" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "system_message" TEXT,
    "json_schema" JSONB,
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
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_ai_template_id_fkey" FOREIGN KEY ("ai_template_id") REFERENCES "ai_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
