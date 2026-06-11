-- CreateTable
CREATE TABLE "variant_prices" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "price_ore" INTEGER NOT NULL,
    "stock_status" TEXT,
    "affiliate_url" TEXT NOT NULL,
    "source_feed" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "variant_prices_variant_id_price_ore_idx" ON "variant_prices"("variant_id", "price_ore");

-- CreateIndex
CREATE UNIQUE INDEX "variant_prices_variant_id_retailer_id_key" ON "variant_prices"("variant_id", "retailer_id");

-- AddForeignKey
ALTER TABLE "variant_prices" ADD CONSTRAINT "variant_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
