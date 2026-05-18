-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('buyer', 'supplier', 'admin');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('sv', 'en');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('it', 'finance', 'sales', 'law');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('workstations', 'tech', 'meeting', 'storage', 'lounge', 'kitchen');

-- CreateEnum
CREATE TYPE "ItemMode" AS ENUM ('new', 'used');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'requesting_quotes', 'quotes_received', 'ordered', 'closed');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('sent', 'viewed', 'quoted', 'won', 'lost', 'expired');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('confirmed', 'in_production', 'shipped', 'delivered', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'klarna_invoice');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'buyer',
    "password_hash" TEXT,
    "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "locale" "Locale" NOT NULL DEFAULT 'sv',
    "email_verified" TIMESTAMP(3),
    "supplier_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "org_number" TEXT,
    "address" JSONB,
    "created_by_user_id" TEXT,
    "claim_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "org_number" TEXT NOT NULL,
    "stripe_account_id" TEXT,
    "coverage_areas" TEXT[],
    "verticals" TEXT[],
    "commission_rate" DECIMAL(4,3) NOT NULL DEFAULT 0.060,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "logo_url" TEXT,
    "short_description" TEXT,
    "perks" TEXT[],
    "used_share" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_catalog" (
    "id" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "width_cells" INTEGER NOT NULL,
    "height_cells" INTEGER NOT NULL,
    "tags" TEXT[],
    "price_new_default" INTEGER NOT NULL,
    "price_used_default" INTEGER,
    "presets" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_pricing" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "price_new" INTEGER,
    "price_used" INTEGER,
    "lead_time_days" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "supplier_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "claim_token" TEXT,
    "name" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "headcount" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "move_in_date" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "floor_plan_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "mode" "ItemMode" NOT NULL,
    "placed_on_floor_plan" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "project_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "RfqStatus" NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewed_at" TIMESTAMP(3),
    "quoted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "total_amount_ex_vat" INTEGER NOT NULL,
    "valid_until" DATE NOT NULL,
    "notes" TEXT,
    "perks" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "mode" "ItemMode" NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'confirmed',
    "total_amount" INTEGER NOT NULL,
    "commission_amount" INTEGER NOT NULL,
    "payout_amount" INTEGER NOT NULL,
    "delivery_address" JSONB NOT NULL,
    "delivery_window_start" DATE NOT NULL,
    "delivery_window_end" DATE NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_transfer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "companies_claim_token_key" ON "companies"("claim_token");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_pricing_supplier_id_item_id_key" ON "supplier_pricing"("supplier_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_claim_token_key" ON "projects"("claim_token");

-- CreateIndex
CREATE INDEX "projects_claim_token_idx" ON "projects"("claim_token");

-- CreateIndex
CREATE UNIQUE INDEX "project_items_project_id_item_id_key" ON "project_items"("project_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_project_id_supplier_id_key" ON "rfqs"("project_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_rfq_id_key" ON "quotes"("rfq_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quote_id_key" ON "orders"("quote_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_pricing" ADD CONSTRAINT "supplier_pricing_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_pricing" ADD CONSTRAINT "supplier_pricing_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

