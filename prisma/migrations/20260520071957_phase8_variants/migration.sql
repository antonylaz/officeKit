-- AlterEnum
ALTER TYPE "ItemCategory" ADD VALUE 'transportation';

-- AlterTable
ALTER TABLE "project_items" ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "quote_lines" ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "service_types" TEXT[] DEFAULT ARRAY['furniture']::TEXT[];

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "sku" TEXT,
    "image_url" TEXT NOT NULL,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "price_new_ore" INTEGER NOT NULL,
    "price_used_default_ore" INTEGER,
    "manufacturer_url" TEXT,
    "blocket_search_query" TEXT,
    "tradera_search_query" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source_feed_id" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_variants_item_id_display_order_idx" ON "product_variants"("item_id", "display_order");

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

