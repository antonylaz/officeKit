-- CreateTable
CREATE TABLE "listing_photos" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_interests" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_company" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_photos_listing_id_display_order_idx" ON "listing_photos"("listing_id", "display_order");

-- CreateIndex
CREATE INDEX "listing_interests_listing_id_created_at_idx" ON "listing_interests"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX "listing_interests_buyer_email_idx" ON "listing_interests"("buyer_email");

-- AddForeignKey
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_interests" ADD CONSTRAINT "listing_interests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
