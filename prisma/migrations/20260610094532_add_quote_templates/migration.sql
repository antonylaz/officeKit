-- CreateTable
CREATE TABLE "quote_templates" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "perks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_template_lines" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "mode" "ItemMode" NOT NULL DEFAULT 'new',
    "unit_price" INTEGER NOT NULL,

    CONSTRAINT "quote_template_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_templates_supplier_id_last_used_at_idx" ON "quote_templates"("supplier_id", "last_used_at");

-- CreateIndex
CREATE UNIQUE INDEX "quote_templates_supplier_id_name_key" ON "quote_templates"("supplier_id", "name");

-- AddForeignKey
ALTER TABLE "quote_templates" ADD CONSTRAINT "quote_templates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_template_lines" ADD CONSTRAINT "quote_template_lines_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "quote_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_template_lines" ADD CONSTRAINT "quote_template_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
