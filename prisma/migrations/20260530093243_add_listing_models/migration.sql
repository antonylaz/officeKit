-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('submitted', 'reviewing', 'approved', 'listed', 'sold', 'withdrawn');

-- CreateEnum
CREATE TYPE "ListingReason" AS ENUM ('closing', 'downsizing', 'moving', 'refurbishing', 'other');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('like_new', 'good', 'fair', 'worn');

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "city" TEXT NOT NULL,
    "move_out_date" DATE,
    "reason" "ListingReason" NOT NULL DEFAULT 'other',
    "status" "ListingStatus" NOT NULL DEFAULT 'submitted',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_items" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "catalog_item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "asking_price_ore" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listings_status_created_at_idx" ON "listings"("status", "created_at");

-- CreateIndex
CREATE INDEX "listings_contact_email_idx" ON "listings"("contact_email");

-- AddForeignKey
ALTER TABLE "listing_items" ADD CONSTRAINT "listing_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_items" ADD CONSTRAINT "listing_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "item_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
