-- CreateTable
CREATE TABLE "ai_build_logs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "prompt" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_ore" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "buyer_ip" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_build_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_build_logs_created_at_idx" ON "ai_build_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_build_logs_buyer_ip_created_at_idx" ON "ai_build_logs"("buyer_ip", "created_at");

-- AddForeignKey
ALTER TABLE "ai_build_logs" ADD CONSTRAINT "ai_build_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
