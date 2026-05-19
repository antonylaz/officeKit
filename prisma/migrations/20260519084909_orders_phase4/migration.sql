-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "tracking_number" TEXT;

-- AlterTable
ALTER TABLE "rfqs" ADD COLUMN     "lost_reason" TEXT;

