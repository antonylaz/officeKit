-- AlterTable
ALTER TABLE "item_catalog" ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "subcategory_rank" INTEGER NOT NULL DEFAULT 0;
