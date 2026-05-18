-- AlterTable: add unique constraint on suppliers.org_number
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_org_number_key" ON "suppliers"("org_number");
