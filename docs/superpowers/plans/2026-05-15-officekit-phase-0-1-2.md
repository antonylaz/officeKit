# OfficeKit Phase 0+1+2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build OfficeKit foundations, buyer happy path (landing → industry → checklist → request stub), and floor plan visualizer — a clickable end-to-end buyer experience persisted to Postgres.

**Architecture:** Single Next.js 15 app deployed to Vercel, Prisma + Postgres on Supabase, NextAuth magic-link via Resend, dnd-kit floor plan, next-intl for Swedish-default i18n. Full schema migrated upfront (Approach A from the design doc).

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Prisma 5, PostgreSQL 16, NextAuth.js v5, Resend, next-intl 3, TanStack Query 5, React Hook Form + Zod, dnd-kit, Vitest, Playwright, pnpm.

**Source spec:** `docs/superpowers/specs/2026-05-15-officekit-phase-0-1-2-design.md`

---

## File structure

```
officeKit/
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                # shadcn config
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── catalog-data.ts            # ~30 catalog items
│   └── migrations/
├── src/
│   ├── middleware.ts              # next-intl locale routing
│   ├── i18n/
│   │   └── request.ts
│   ├── messages/
│   │   ├── sv.json
│   │   └── en.json
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # landing
│   │   │   ├── start/page.tsx     # industry picker
│   │   │   ├── projects/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── checklist/page.tsx
│   │   │   │       ├── floorplan/page.tsx
│   │   │   │       ├── request/page.tsx
│   │   │   │       └── confirmation/page.tsx
│   │   │   └── orders/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── v1/
│   │           ├── catalog/items/route.ts
│   │           ├── industries/route.ts
│   │           ├── projects/
│   │           │   ├── route.ts                  # POST
│   │           │   └── [id]/
│   │           │       ├── route.ts              # GET, PATCH
│   │           │       ├── items/[itemLineId]/route.ts
│   │           │       └── request-quotes/route.ts
│   │           └── auth/magic-link/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   ├── shell/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── checklist/
│   │   │   ├── CategoryTabs.tsx
│   │   │   ├── ItemRow.tsx
│   │   │   └── SummarySidebar.tsx
│   │   ├── floorplan/
│   │   │   ├── Canvas.tsx
│   │   │   ├── Palette.tsx
│   │   │   ├── PlacedItem.tsx
│   │   │   └── state.ts
│   │   └── industry/
│   │       └── IndustryCard.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── i18n.ts
│   │   ├── money.ts
│   │   ├── presets.ts
│   │   ├── room-presets.ts
│   │   ├── rate-limit.ts
│   │   └── claim-token.ts
│   └── server/
│       ├── projects.ts
│       └── rfq-fanout.ts
└── tests/
    ├── unit/
    │   ├── money.test.ts
    │   ├── presets.test.ts
    │   ├── room-presets.test.ts
    │   └── floorplan-state.test.ts
    └── e2e/
        └── buyer-happy-path.spec.ts
```

---

## Phase 0 — Foundations

### Task 0.1: Initialize Next.js 15 + TypeScript strict

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `README.md`

- [ ] **Step 1: Initialize Next.js app non-interactively**

```bash
cd /Users/antoniolazeski/Desktop/officeKit
pnpm dlx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack --use-pnpm
```

Expected: project files created in current directory. If it complains the directory isn't empty (PDFs and `docs/` exist), pass `--yes` to allow.

- [ ] **Step 2: Enable strict TypeScript**

Edit `tsconfig.json`, ensure `compilerOptions` contains:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

- [ ] **Step 3: Init git and first commit**

```bash
cd /Users/antoniolazeski/Desktop/officeKit
git init
git add -A
git commit -m "chore: scaffold Next.js 15 app with TypeScript strict"
```

Expected: clean working tree.

---

### Task 0.2: Install runtime + dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add prisma @prisma/client \
  next-auth@beta @auth/prisma-adapter \
  resend @react-email/components \
  next-intl \
  @tanstack/react-query \
  react-hook-form @hookform/resolvers zod \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers \
  framer-motion \
  @upstash/ratelimit @upstash/redis \
  date-fns
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom \
  @playwright/test \
  prisma \
  tsx
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 3: Add scripts to package.json**

In `package.json` `"scripts"` section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install runtime and dev dependencies"
```

---

### Task 0.3: Configure shadcn/ui + design tokens

**Files:**
- Create: `components.json`, `src/components/ui/`, `src/app/globals.css` (modify)
- Create: `tailwind.config.ts` (modify if exists)

- [ ] **Step 1: Init shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

Accept defaults; this creates `components.json` and base styles.

- [ ] **Step 2: Add the design-system CSS variables**

Replace the contents of `src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-cream: #f5f1e8;
  --color-cream-2: #ebe5d4;
  --color-paper: #faf7ef;
  --color-ink: #1a1f1a;
  --color-ink-soft: #4a544a;
  --color-ink-mute: #8a8f86;
  --color-line: #d8d2c0;
  --color-forest: #1f3a2e;
  --color-terracotta: #c5552d;
  --color-green-leaf: #6b8e5a;
  --color-gold: #d4a056;

  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Manrope", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-pill: 100px;
  --radius-card: 4px;
}

:root {
  --accent: var(--color-forest);
}

[data-industry="it"]     { --accent: #3a4a52; }
[data-industry="finance"]{ --accent: #1f3a52; }
[data-industry="sales"]  { --accent: #c5552d; }
[data-industry="law"]    { --accent: #6b2a3a; }

html { background: var(--color-paper); color: var(--color-ink); }
body { font-family: var(--font-body); }
```

- [ ] **Step 3: Wire fonts via next/font**

Create `src/lib/fonts.ts`:

```ts
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});
```

- [ ] **Step 4: Install a few base shadcn components**

```bash
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu select toast
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure shadcn/ui and design tokens"
```

---

### Task 0.4: Docker Compose Postgres + .env.example

**Files:**
- Create: `docker-compose.yml`, `.env.example`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: officekit-postgres
    environment:
      POSTGRES_USER: officekit
      POSTGRES_PASSWORD: officekit
      POSTGRES_DB: officekit
    ports:
      - "5432:5432"
    volumes:
      - officekit-pg:/var/lib/postgresql/data
volumes:
  officekit-pg:
```

- [ ] **Step 2: Create .env.example**

```bash
# Database
DATABASE_URL="postgresql://officekit:officekit@localhost:5432/officekit?schema=public"

# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Resend (transactional email)
RESEND_API_KEY="re_xxx"
RESEND_FROM_EMAIL="OfficeKit <hello@officekit.se>"

# Upstash Redis (rate limiting, optional in dev — falls back to in-memory)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 3: Copy to .env.local and start db**

```bash
cp .env.example .env.local
# generate AUTH_SECRET and paste it into .env.local
openssl rand -base64 32
docker compose up -d
```

Expected: `officekit-postgres` running on 5432.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker compose postgres and env template"
```

---

### Task 0.5: Define Prisma schema (full section-5 model)

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Write the schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  buyer
  supplier
  admin
}

enum Locale {
  sv
  en
}

enum Industry {
  it
  finance
  sales
  law
}

enum ItemCategory {
  workstations
  tech
  meeting
  storage
  lounge
  kitchen
}

enum ItemMode {
  new
  used
}

enum ProjectStatus {
  draft
  requesting_quotes
  quotes_received
  ordered
  closed
}

enum RfqStatus {
  sent
  viewed
  quoted
  won
  lost
  expired
}

enum OrderStatus {
  confirmed
  in_production
  shipped
  delivered
  paid
  cancelled
}

enum PaymentMethod {
  card
  klarna_invoice
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  name            String?
  phone           String?
  role            Role     @default(buyer)
  passwordHash    String?  @map("password_hash")
  twoFaEnabled    Boolean  @default(false) @map("two_fa_enabled")
  locale          Locale   @default(sv)
  emailVerified   DateTime? @map("email_verified")
  supplierId      String?  @map("supplier_id")
  supplier        Supplier? @relation(fields: [supplierId], references: [id])
  companies       Company[]
  projects        Project[]
  accounts        Account[]
  sessions        Session[]
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Account {
  id                String  @id @default(uuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model Company {
  id                String   @id @default(uuid())
  name              String
  orgNumber         String?  @map("org_number")
  address           Json?
  createdByUserId   String?  @map("created_by_user_id")
  createdByUser     User?    @relation(fields: [createdByUserId], references: [id])
  claimToken        String?  @unique @map("claim_token")
  projects          Project[]
  orders            Order[]
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("companies")
}

model Supplier {
  id                String   @id @default(uuid())
  name              String
  legalName         String   @map("legal_name")
  orgNumber         String   @map("org_number")
  stripeAccountId   String?  @map("stripe_account_id")
  coverageAreas     String[] @map("coverage_areas")
  verticals         String[]
  commissionRate    Decimal  @default(0.060) @map("commission_rate") @db.Decimal(4, 3)
  active            Boolean  @default(true)
  logoUrl           String?  @map("logo_url")
  shortDescription  String?  @map("short_description")
  perks             String[]
  usedShare         Decimal  @default(0.0) @map("used_share") @db.Decimal(3, 2)
  users             User[]
  pricing           SupplierPricing[]
  rfqs              Rfq[]
  orders            Order[]
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("suppliers")
}

model ItemCatalog {
  id                String       @id
  category          ItemCategory
  name              String
  description       String?
  icon              String?
  widthCells        Int          @map("width_cells")
  heightCells       Int          @map("height_cells")
  tags              String[]
  priceNewDefault   Int          @map("price_new_default")   // öre
  priceUsedDefault  Int?         @map("price_used_default")  // öre
  presets           Json
  projectItems      ProjectItem[]
  supplierPricing   SupplierPricing[]
  quoteLines        QuoteLine[]
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")

  @@map("item_catalog")
}

model SupplierPricing {
  id            String   @id @default(uuid())
  supplierId    String   @map("supplier_id")
  itemId        String   @map("item_id")
  priceNew      Int?     @map("price_new")   // öre
  priceUsed     Int?     @map("price_used")  // öre
  leadTimeDays  Int      @map("lead_time_days")
  available     Boolean  @default(true)
  supplier      Supplier @relation(fields: [supplierId], references: [id])
  item          ItemCatalog @relation(fields: [itemId], references: [id])

  @@unique([supplierId, itemId])
  @@map("supplier_pricing")
}

model Project {
  id                String        @id @default(uuid())
  companyId         String        @map("company_id")
  createdByUserId   String?       @map("created_by_user_id")
  claimToken        String?       @unique @map("claim_token")
  name              String
  industry          Industry
  headcount         Int
  city              String
  moveInDate        DateTime?     @map("move_in_date") @db.Date
  status            ProjectStatus @default(draft)
  floorPlanData     Json?         @map("floor_plan_data")
  company           Company       @relation(fields: [companyId], references: [id])
  createdByUser     User?         @relation(fields: [createdByUserId], references: [id])
  items             ProjectItem[]
  rfqs              Rfq[]
  orders            Order[]
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@index([claimToken])
  @@map("projects")
}

model ProjectItem {
  id                  String   @id @default(uuid())
  projectId           String   @map("project_id")
  itemId              String   @map("item_id")
  quantity            Int
  mode                ItemMode
  placedOnFloorPlan   Boolean  @default(false) @map("placed_on_floor_plan")
  project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  item                ItemCatalog @relation(fields: [itemId], references: [id])

  @@unique([projectId, itemId])
  @@map("project_items")
}

model Rfq {
  id           String     @id @default(uuid())
  projectId    String     @map("project_id")
  supplierId   String     @map("supplier_id")
  status       RfqStatus  @default(sent)
  sentAt       DateTime   @default(now()) @map("sent_at")
  viewedAt     DateTime?  @map("viewed_at")
  quotedAt     DateTime?  @map("quoted_at")
  decidedAt    DateTime?  @map("decided_at")
  deadlineAt   DateTime   @map("deadline_at")
  project      Project    @relation(fields: [projectId], references: [id])
  supplier     Supplier   @relation(fields: [supplierId], references: [id])
  quote        Quote?

  @@unique([projectId, supplierId])
  @@map("rfqs")
}

model Quote {
  id                String   @id @default(uuid())
  rfqId             String   @unique @map("rfq_id")
  totalAmount       Int      @map("total_amount")          // öre incl VAT
  totalAmountExVat  Int      @map("total_amount_ex_vat")   // öre
  validUntil        DateTime @map("valid_until") @db.Date
  notes             String?
  perks             String[]
  rfq               Rfq      @relation(fields: [rfqId], references: [id])
  lines             QuoteLine[]
  order             Order?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("quotes")
}

model QuoteLine {
  id          String   @id @default(uuid())
  quoteId     String   @map("quote_id")
  itemId      String   @map("item_id")
  quantity    Int
  mode        ItemMode
  unitPrice   Int      @map("unit_price")   // öre ex VAT
  lineTotal   Int      @map("line_total")   // öre
  quote       Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  item        ItemCatalog @relation(fields: [itemId], references: [id])

  @@map("quote_lines")
}

model Order {
  id                      String        @id @default(uuid())
  projectId               String        @map("project_id")
  quoteId                 String        @unique @map("quote_id")
  supplierId              String        @map("supplier_id")
  companyId               String        @map("company_id")
  status                  OrderStatus   @default(confirmed)
  totalAmount             Int           @map("total_amount")        // öre
  commissionAmount        Int           @map("commission_amount")   // öre
  payoutAmount            Int           @map("payout_amount")       // öre
  deliveryAddress         Json          @map("delivery_address")
  deliveryWindowStart     DateTime      @map("delivery_window_start") @db.Date
  deliveryWindowEnd       DateTime      @map("delivery_window_end") @db.Date
  paymentMethod           PaymentMethod @map("payment_method")
  stripePaymentIntentId   String?       @map("stripe_payment_intent_id")
  stripeTransferId        String?       @map("stripe_transfer_id")
  project                 Project       @relation(fields: [projectId], references: [id])
  quote                   Quote         @relation(fields: [quoteId], references: [id])
  supplier                Supplier      @relation(fields: [supplierId], references: [id])
  company                 Company       @relation(fields: [companyId], references: [id])
  createdAt               DateTime      @default(now()) @map("created_at")
  updatedAt               DateTime      @updatedAt @map("updated_at")

  @@map("orders")
}
```

- [ ] **Step 2: Create the Prisma client singleton**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 3: Run initial migration**

```bash
pnpm db:migrate --name init
```

Expected: migration created in `prisma/migrations/`, schema applied, Prisma client generated. If it errors with "no shadow database", confirm Postgres is running (`docker compose ps`).

- [ ] **Step 4: Commit**

```bash
git add prisma src/lib/db.ts
git commit -m "feat(db): define full schema and run initial migration"
```

---

### Task 0.6: Money library (TDD)

**Files:**
- Create: `src/lib/money.ts`
- Test: `tests/unit/money.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fromSek, toSek, formatSek, addVat, removeVat, VAT_RATE } from "@/lib/money";

describe("money", () => {
  describe("fromSek / toSek", () => {
    it("converts SEK to integer öre", () => {
      expect(fromSek(100)).toBe(10_000);
      expect(fromSek(1.5)).toBe(150);
    });

    it("rounds half-up on conversion", () => {
      expect(fromSek(0.005)).toBe(1);
      expect(fromSek(0.004)).toBe(0);
    });

    it("round-trips through öre and back", () => {
      expect(toSek(fromSek(1234.56))).toBe(1234.56);
    });
  });

  describe("addVat / removeVat", () => {
    it("adds 25% VAT to a base amount in öre", () => {
      expect(addVat(10_000)).toBe(12_500);
    });

    it("removes 25% VAT from a gross amount in öre", () => {
      expect(removeVat(12_500)).toBe(10_000);
    });

    it("VAT_RATE constant equals 0.25", () => {
      expect(VAT_RATE).toBe(0.25);
    });
  });

  describe("formatSek", () => {
    it("formats öre as Swedish currency string", () => {
      const out = formatSek(123_456_700);
      // contains the digits with sv-SE thin spaces
      expect(out).toMatch(/1[\s  ]234[\s  ]567/);
      expect(out.toLowerCase()).toContain("kr");
    });
  });
});
```

- [ ] **Step 2: Configure vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Run tests, expect fail**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '@/lib/money'`.

- [ ] **Step 4: Implement the library**

Create `src/lib/money.ts`:

```ts
export const VAT_RATE = 0.25;

export function fromSek(sek: number): number {
  return Math.round(sek * 100);
}

export function toSek(ore: number): number {
  return ore / 100;
}

export function addVat(oreExVat: number): number {
  return Math.round(oreExVat * (1 + VAT_RATE));
}

export function removeVat(oreIncVat: number): number {
  return Math.round(oreIncVat / (1 + VAT_RATE));
}

export function formatSek(ore: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(toSek(ore));
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm test
```

Expected: all `money` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/money.ts tests/unit/money.test.ts vitest.config.ts
git commit -m "feat(lib): add money library with integer-öre SEK and VAT helpers"
```

---

### Task 0.7: Presets library (TDD)

**Files:**
- Create: `src/lib/presets.ts`
- Test: `tests/unit/presets.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/presets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeQuantity, INDUSTRIES } from "@/lib/presets";

describe("presets", () => {
  it("multiplies preset ratio by headcount, rounding up", () => {
    expect(computeQuantity({ it: 1, finance: 0.5, sales: 0, law: 1 }, "it", 10)).toBe(10);
    expect(computeQuantity({ it: 1, finance: 0.5, sales: 0, law: 1 }, "finance", 10)).toBe(5);
    expect(computeQuantity({ it: 1, finance: 0.5, sales: 0, law: 1 }, "sales", 10)).toBe(0);
  });

  it("rounds up fractional results (a phone booth for 8 law staff)", () => {
    expect(computeQuantity({ law: 0.08 }, "law", 8)).toBe(1);
    expect(computeQuantity({ law: 0.08 }, "law", 13)).toBe(2);
  });

  it("returns 0 when the industry is not in the preset map", () => {
    expect(computeQuantity({ it: 1 }, "law", 10)).toBe(0);
  });

  it("exposes the 4 industries with metadata", () => {
    expect(INDUSTRIES).toHaveLength(4);
    expect(INDUSTRIES.map((i) => i.id).sort()).toEqual(["finance", "it", "law", "sales"]);
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
pnpm test presets
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/presets.ts`:

```ts
import type { Industry } from "@prisma/client";

export type Presets = Partial<Record<Industry, number>>;

export function computeQuantity(presets: Presets, industry: Industry, headcount: number): number {
  const ratio = presets[industry] ?? 0;
  return Math.ceil(ratio * headcount);
}

export interface IndustryMeta {
  id: Industry;
  label: string;
  tagline: string;
  avgSpendPerSeatSek: number;
  reuseShareLabel: string;
  setupTimeLabel: string;
  complianceFlags?: string[];
}

export const INDUSTRIES: readonly IndustryMeta[] = [
  {
    id: "it",
    label: "IT & Tech",
    tagline: "Software shops, dev studios, SaaS startups. Heavy on monitors, dual-screen setups, and reliable AV.",
    avgSpendPerSeatSek: 28_400,
    reuseShareLabel: "~55%",
    setupTimeLabel: "3–5 days",
  },
  {
    id: "finance",
    label: "Finance & Economic",
    tagline: "Accounting, audit, advisory, asset management. Privacy-conscious, document-heavy, client-facing.",
    avgSpendPerSeatSek: 34_200,
    reuseShareLabel: "~45%",
    setupTimeLabel: "4–6 days",
    complianceFlags: ["GDPR", "ISO 27001"],
  },
  {
    id: "sales",
    label: "Sales & Commercial",
    tagline: "Field sales, inside sales, account management. Open floor, lots of calls, hot-desking common.",
    avgSpendPerSeatSek: 22_800,
    reuseShareLabel: "~60%",
    setupTimeLabel: "2–4 days",
  },
  {
    id: "law",
    label: "Law Firms",
    tagline: "Advokatbyrå, in-house counsel. Confidentiality-first, individual offices, paper archives still relevant.",
    avgSpendPerSeatSek: 41_600,
    reuseShareLabel: "~50%",
    setupTimeLabel: "5–8 days",
    complianceFlags: ["Sekretess", "GDPR"],
  },
] as const;
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test presets
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/presets.ts tests/unit/presets.test.ts
git commit -m "feat(lib): add industry presets and quantity computation"
```

---

### Task 0.8: Catalog seed data + seed script

**Files:**
- Create: `prisma/catalog-data.ts`, `prisma/seed.ts`

- [ ] **Step 1: Create the catalog data module**

Create `prisma/catalog-data.ts`:

```ts
// Reconstruction note: the source spec (Appendix A) references the CATALOG constant
// in officekit-poc-v2.html. That file is not available; this is a reconstruction
// from PDFs + Appendix A + sensible Swedish-office defaults.
// Replace wholesale if the canonical HTML is recovered.

import type { ItemCategory, Industry } from "@prisma/client";

type Preset = Partial<Record<Industry, number>>;

export interface SeedItem {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  icon: string;
  widthCells: number;
  heightCells: number;
  tags: string[];
  priceNewDefaultSek: number;
  priceUsedDefaultSek: number | null;
  presets: Preset;
}

// Prices in SEK ex VAT — converted to öre at seed time.
export const CATALOG: SeedItem[] = [
  // workstations
  { id: "desk-electric", category: "workstations", name: "Sit-stand desk, electric", description: "160×80 cm, programmable height memory", icon: "🪑", widthCells: 4, heightCells: 2, tags: ["ergo"], priceNewDefaultSek: 5400, priceUsedDefaultSek: 2700, presets: { it: 1, finance: 1, sales: 0, law: 1 } },
  { id: "desk-fixed", category: "workstations", name: "Fixed desk", description: "140×70 cm, oak veneer", icon: "🟫", widthCells: 4, heightCells: 2, tags: ["essential"], priceNewDefaultSek: 2800, priceUsedDefaultSek: 1200, presets: { it: 0, finance: 0, sales: 1, law: 0 } },
  { id: "desk-solid", category: "workstations", name: "Solid wood desk", description: "180×90 cm, premium oak", icon: "🟫", widthCells: 5, heightCells: 2, tags: ["premium"], priceNewDefaultSek: 12000, priceUsedDefaultSek: 5500, presets: { law: 1 } },
  { id: "task-chair", category: "workstations", name: "Ergonomic task chair", description: "RH Logic / Kinnarps Plus 8 class", icon: "💺", widthCells: 2, heightCells: 2, tags: ["ergo", "essential"], priceNewDefaultSek: 4900, priceUsedDefaultSek: 2200, presets: { it: 1, finance: 1, sales: 1, law: 0 } },
  { id: "leather-chair", category: "workstations", name: "Leather executive chair", description: "High-back, brown leather", icon: "🪑", widthCells: 2, heightCells: 2, tags: ["premium", "client-facing"], priceNewDefaultSek: 9800, priceUsedDefaultSek: 4500, presets: { law: 1 } },
  { id: "monitor-arm", category: "workstations", name: "Single monitor arm", description: "Gas-spring, VESA 100", icon: "🦾", widthCells: 1, heightCells: 1, tags: ["ergo"], priceNewDefaultSek: 1200, priceUsedDefaultSek: 600, presets: { it: 1, finance: 1, sales: 0.5, law: 0.5 } },
  { id: "monitor-arm-dual", category: "workstations", name: "Dual monitor arm", description: "Gas-spring, dual VESA 100", icon: "🦾", widthCells: 1, heightCells: 1, tags: ["ergo"], priceNewDefaultSek: 1900, priceUsedDefaultSek: 950, presets: { it: 1, finance: 0.5 } },
  { id: "desk-divider", category: "workstations", name: "Acoustic desk divider", description: "Felt, 160×40 cm", icon: "🟧", widthCells: 4, heightCells: 1, tags: ["acoustic"], priceNewDefaultSek: 1400, priceUsedDefaultSek: 600, presets: { sales: 1 } },

  // tech
  { id: "monitor-27", category: "tech", name: '27" monitor, 4K', description: "Dell UltraSharp or equivalent", icon: "🖥️", widthCells: 2, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 4500, priceUsedDefaultSek: 2200, presets: { it: 2, finance: 2, sales: 1, law: 1 } },
  { id: "dock-tb4", category: "tech", name: "Thunderbolt 4 dock", description: "90W charging, dual 4K out", icon: "🔌", widthCells: 1, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 3200, priceUsedDefaultSek: null, presets: { it: 1, finance: 1, sales: 1, law: 1 } },
  { id: "headset", category: "tech", name: "USB headset, noise-cancelling", description: "Jabra Evolve2 65 class", icon: "🎧", widthCells: 1, heightCells: 1, tags: ["tech", "acoustic"], priceNewDefaultSek: 2400, priceUsedDefaultSek: null, presets: { sales: 1, it: 0.3 } },
  { id: "webcam-hd", category: "tech", name: "HD webcam", description: "1080p, autofocus", icon: "📷", widthCells: 1, heightCells: 1, tags: ["tech"], priceNewDefaultSek: 900, priceUsedDefaultSek: null, presets: { it: 0.5, finance: 0.5, sales: 0.5, law: 0.5 } },
  { id: "video-bar", category: "tech", name: "Conference video bar", description: "Logitech Rally Bar class", icon: "📹", widthCells: 2, heightCells: 1, tags: ["tech", "av"], priceNewDefaultSek: 28000, priceUsedDefaultSek: 14000, presets: { it: 0.05, finance: 0.08, sales: 0.06, law: 0.05 } },
  { id: "display-65", category: "tech", name: '65" boardroom display', description: '4K, with mount', icon: "📺", widthCells: 3, heightCells: 1, tags: ["tech", "av"], priceNewDefaultSek: 18000, priceUsedDefaultSek: 9000, presets: { it: 0.05, finance: 0.08, sales: 0.06, law: 0.05 } },
  { id: "shredder", category: "tech", name: "Cross-cut shredder", description: "Security level P-4", icon: "🗑️", widthCells: 1, heightCells: 1, tags: ["gdpr", "security"], priceNewDefaultSek: 4200, priceUsedDefaultSek: 1800, presets: { finance: 0.1, law: 0.2 } },

  // meeting
  { id: "meeting-table-6", category: "meeting", name: "Meeting table, 6-person", description: "200×100 cm, oak", icon: "🪟", widthCells: 5, heightCells: 3, tags: ["meeting"], priceNewDefaultSek: 8500, priceUsedDefaultSek: 4000, presets: { it: 0.1, finance: 0.15, sales: 0.1, law: 0.15 } },
  { id: "boardroom-table", category: "meeting", name: "Boardroom table", description: "320×120 cm, seats 12", icon: "🟫", widthCells: 8, heightCells: 3, tags: ["meeting", "client-facing"], priceNewDefaultSek: 24000, priceUsedDefaultSek: 11000, presets: { it: 0.04, finance: 0.06, sales: 0.04, law: 0.08 } },
  { id: "meeting-chair", category: "meeting", name: "Meeting chair, fabric", description: "Stackable, mid-back", icon: "🪑", widthCells: 1, heightCells: 1, tags: ["meeting"], priceNewDefaultSek: 1800, priceUsedDefaultSek: 800, presets: { it: 0.6, finance: 0.8, sales: 0.6, law: 0.8 } },
  { id: "whiteboard", category: "meeting", name: "Magnetic whiteboard, 200×100 cm", description: "Wall-mounted", icon: "📋", widthCells: 5, heightCells: 1, tags: ["meeting"], priceNewDefaultSek: 2400, priceUsedDefaultSek: 1100, presets: { it: 0.15, finance: 0.1, sales: 0.15, law: 0.05 } },
  { id: "phone-booth", category: "meeting", name: "Phone booth, single-person", description: "Soundproof, ventilated", icon: "📞", widthCells: 2, heightCells: 2, tags: ["meeting", "acoustic"], priceNewDefaultSek: 48000, priceUsedDefaultSek: 22000, presets: { it: 0.06, finance: 0.1, sales: 0.15, law: 0.08 } },

  // storage
  { id: "locker-8", category: "storage", name: "Locker, 8-compartment", description: "Steel, key locks", icon: "🗄️", widthCells: 2, heightCells: 2, tags: ["storage"], priceNewDefaultSek: 6400, priceUsedDefaultSek: 2800, presets: { it: 0.13, finance: 0.13, sales: 0.13, law: 0.13 } },
  { id: "cabinet-lock", category: "storage", name: "Lockable cabinet", description: "1800×800 mm, key lock", icon: "🗃️", widthCells: 2, heightCells: 1, tags: ["storage"], priceNewDefaultSek: 4800, priceUsedDefaultSek: 2100, presets: { finance: 0.25, law: 0.4 } },
  { id: "cabinet-fireproof", category: "storage", name: "Fireproof cabinet", description: "60 min fire rating", icon: "🔥", widthCells: 2, heightCells: 1, tags: ["storage", "security"], priceNewDefaultSek: 18000, priceUsedDefaultSek: 8500, presets: { finance: 0.05, law: 0.1 } },
  { id: "safe-small", category: "storage", name: "Office safe, small", description: "Electronic lock", icon: "🔒", widthCells: 1, heightCells: 1, tags: ["storage", "security"], priceNewDefaultSek: 8200, priceUsedDefaultSek: 3500, presets: { finance: 0.04, law: 0.08 } },
  { id: "shelving", category: "storage", name: "Open shelving, 5-tier", description: "1800×800 mm", icon: "📚", widthCells: 2, heightCells: 1, tags: ["storage"], priceNewDefaultSek: 1900, priceUsedDefaultSek: 800, presets: { it: 0.2, finance: 0.3, sales: 0.2, law: 0.3 } },

  // lounge
  { id: "sofa-3", category: "lounge", name: "3-seat sofa", description: "Fabric, mid-century", icon: "🛋️", widthCells: 5, heightCells: 2, tags: ["lounge", "client-facing"], priceNewDefaultSek: 14000, priceUsedDefaultSek: 6500, presets: { it: 0.04, finance: 0.05, sales: 0.04, law: 0.06 } },
  { id: "armchair", category: "lounge", name: "Armchair", description: "Leather, lounge style", icon: "🪑", widthCells: 2, heightCells: 2, tags: ["lounge", "client-facing"], priceNewDefaultSek: 8500, priceUsedDefaultSek: 3800, presets: { it: 0.05, finance: 0.08, sales: 0.05, law: 0.12 } },
  { id: "side-table", category: "lounge", name: "Side table", description: "Round, 50 cm, oak", icon: "🟫", widthCells: 1, heightCells: 1, tags: ["lounge"], priceNewDefaultSek: 1800, priceUsedDefaultSek: 800, presets: { it: 0.05, finance: 0.08, sales: 0.05, law: 0.12 } },
  { id: "rug-large", category: "lounge", name: "Large rug, 200×300 cm", description: "Wool, neutral", icon: "🟪", widthCells: 5, heightCells: 3, tags: ["lounge"], priceNewDefaultSek: 4200, priceUsedDefaultSek: 1900, presets: { law: 0.08, finance: 0.05 } },
  { id: "plant-large", category: "lounge", name: "Large plant, floor-standing", description: "Ficus or similar, 180 cm", icon: "🪴", widthCells: 1, heightCells: 1, tags: ["lounge"], priceNewDefaultSek: 1400, priceUsedDefaultSek: null, presets: { it: 0.15, finance: 0.1, sales: 0.15, law: 0.1 } },

  // kitchen
  { id: "coffee-machine", category: "kitchen", name: "Bean-to-cup coffee machine", description: "Commercial grade, ~30 cups/day", icon: "☕", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 28000, priceUsedDefaultSek: 14000, presets: { it: 0.04, finance: 0.04, sales: 0.04, law: 0.04 } },
  { id: "fridge", category: "kitchen", name: "Office fridge, 280L", description: "Energy class A++", icon: "🧊", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 6800, priceUsedDefaultSek: 3000, presets: { it: 0.05, finance: 0.04, sales: 0.05, law: 0.04 } },
  { id: "dishwasher", category: "kitchen", name: "Dishwasher", description: "Integrated, 14 settings", icon: "🍽️", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 5400, priceUsedDefaultSek: 2200, presets: { it: 0.04, finance: 0.04, sales: 0.04, law: 0.04 } },
  { id: "communal-table", category: "kitchen", name: "Communal kitchen table", description: "240×90 cm, seats 10", icon: "🟫", widthCells: 6, heightCells: 2, tags: ["kitchen"], priceNewDefaultSek: 8800, priceUsedDefaultSek: 3800, presets: { it: 0.06, finance: 0.06, sales: 0.06, law: 0.06 } },
  { id: "bar-stool", category: "kitchen", name: "Bar stool", description: "Steel + oak", icon: "🪑", widthCells: 1, heightCells: 1, tags: ["kitchen"], priceNewDefaultSek: 1400, priceUsedDefaultSek: 600, presets: { it: 0.2, finance: 0.2, sales: 0.25, law: 0.2 } },
];
```

- [ ] **Step 2: Create the seed script**

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { CATALOG } from "./catalog-data";

const db = new PrismaClient();

async function main() {
  console.log("Seeding catalog...");
  for (const item of CATALOG) {
    await db.itemCatalog.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        icon: item.icon,
        widthCells: item.widthCells,
        heightCells: item.heightCells,
        tags: item.tags,
        priceNewDefault: item.priceNewDefaultSek * 100,
        priceUsedDefault: item.priceUsedDefaultSek === null ? null : item.priceUsedDefaultSek * 100,
        presets: item.presets,
      },
    });
  }
  console.log(`  → ${CATALOG.length} catalog items`);

  console.log("Seeding mock suppliers...");
  const suppliers = [
    {
      name: "Nordkontor Demo AB",
      legalName: "Nordkontor Demo Aktiebolag",
      orgNumber: "559000-0001",
      coverageAreas: ["Stockholm", "Uppsala", "Västerås"],
      verticals: ["it", "sales"],
      shortDescription: "Tech-forward office supplier, strong in monitors and AV.",
      perks: ["Free white-glove delivery", "10 yr structural warranty"],
      usedShare: 0.55,
    },
    {
      name: "Återbruk Möbler Demo",
      legalName: "Återbruk Möbler Demo AB",
      orgNumber: "559000-0002",
      coverageAreas: ["Stockholm", "Göteborg", "Malmö"],
      verticals: ["finance", "law"],
      shortDescription: "Refurbished premium furniture specialist.",
      perks: ["100% refurbished options", "Carbon-neutral delivery"],
      usedShare: 0.95,
    },
    {
      name: "Stockholm Office Demo",
      legalName: "Stockholm Office Demo AB",
      orgNumber: "559000-0003",
      coverageAreas: ["Stockholm"],
      verticals: ["it", "finance", "sales", "law"],
      shortDescription: "Generalist office supplier serving the Stockholm region.",
      perks: ["48h delivery within Stockholm", "On-site assembly"],
      usedShare: 0.4,
    },
  ];
  for (const s of suppliers) {
    await db.supplier.upsert({
      where: { orgNumber: s.orgNumber },
      update: {},
      create: s,
    });
  }
  console.log(`  → ${suppliers.length} suppliers`);

  console.log("Seeding admin user...");
  await db.user.upsert({
    where: { email: "admin@officekit.se" },
    update: {},
    create: { email: "admin@officekit.se", name: "OfficeKit Admin", role: "admin" },
  });
  console.log("  → 1 admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 3: Make Supplier.orgNumber unique in schema**

Edit `prisma/schema.prisma`, change the `Supplier.orgNumber` line:

```prisma
  orgNumber         String   @unique @map("org_number")
```

Then re-migrate:

```bash
pnpm db:migrate --name supplier-org-number-unique
```

- [ ] **Step 4: Run seed**

```bash
pnpm db:seed
```

Expected: catalog and suppliers inserted. Verify with:

```bash
pnpm db:studio
```

- [ ] **Step 5: Commit**

```bash
git add prisma/catalog-data.ts prisma/seed.ts prisma/schema.prisma prisma/migrations
git commit -m "feat(db): seed catalog, mock suppliers, and admin user"
```

---

### Task 0.9: NextAuth (magic-link) + Resend

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/rate-limit.ts`, `src/emails/MagicLink.tsx`
- Modify: `prisma/schema.prisma` (already has Account/Session/VerificationToken from Task 0.5 — no change)

- [ ] **Step 1: Create the magic-link email template**

Create `src/emails/MagicLink.tsx`:

```tsx
import { Body, Container, Heading, Html, Link, Preview, Text } from "@react-email/components";

export function MagicLinkEmail({ url, locale }: { url: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { preview: "Logga in på OfficeKit", heading: "Logga in på OfficeKit", body: "Klicka på länken för att logga in. Länken är giltig i 24 timmar.", cta: "Logga in" }
    : { preview: "Sign in to OfficeKit", heading: "Sign in to OfficeKit", body: "Click the link to sign in. The link is valid for 24 hours.", cta: "Sign in" };
  return (
    <Html lang={locale}>
      <Preview>{t.preview}</Preview>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif", color: "#1a1f1a" }}>{t.heading}</Heading>
          <Text style={{ color: "#4a544a" }}>{t.body}</Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 16, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Create rate-limit helper**

Create `src/lib/rate-limit.ts`:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback for dev (NOT for production).
class MemoryStore {
  private hits = new Map<string, number[]>();
  async limit(key: string) {
    const now = Date.now();
    const windowMs = 60_000;
    const hits = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    hits.push(now);
    this.hits.set(key, hits);
    return { success: hits.length <= 10, remaining: Math.max(0, 10 - hits.length) };
  }
}

export const magicLinkLimiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.fixedWindow(10, "60 s"),
        analytics: false,
      })
    : new MemoryStore();
```

- [ ] **Step 3: Create the NextAuth config**

Create `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";
import { Resend as ResendClient } from "resend";
import { MagicLinkEmail } from "@/emails/MagicLink";

const resend = new ResendClient(process.env.RESEND_API_KEY!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: { signIn: "/sv/login", verifyRequest: "/sv/login/check-email" },
  providers: [
    Resend({
      from: process.env.RESEND_FROM_EMAIL!,
      async sendVerificationRequest({ identifier: email, url }) {
        const locale = url.includes("/en/") ? "en" : "sv";
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: email,
          subject: locale === "sv" ? "Logga in på OfficeKit" : "Sign in to OfficeKit",
          react: MagicLinkEmail({ url, locale }),
        });
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      const { claimAnonymousProjects } = await import("@/server/claim");
      if (user.id) await claimAnonymousProjects(user.id);
    },
  },
});
```

- [ ] **Step 4: Mount the NextAuth route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
export { GET, POST } from "@/lib/auth";
```

Note: `handlers` from `auth.ts` exposes `GET` and `POST`. If the version of next-auth you're on requires `handlers.GET`, change to: `import { handlers } from "@/lib/auth"; export const { GET, POST } = handlers;`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): NextAuth magic-link with Resend"
```

---

### Task 0.10: next-intl setup (sv default, en fallback)

**Files:**
- Create: `src/middleware.ts`, `src/i18n/request.ts`, `src/messages/sv.json`, `src/messages/en.json`, `src/i18n/routing.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Configure next-intl plugin**

Replace `next.config.ts`:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Routing config**

Create `src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["sv", "en"],
  defaultLocale: "sv",
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 3: Request handler**

Create `src/i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "sv" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Middleware**

Create `src/middleware.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 5: Initial messages**

Create `src/messages/sv.json`:

```json
{
  "common": {
    "appName": "OfficeKit",
    "tagline": "Office equipment, sourced",
    "cta": {
      "start": "Starta ditt kontor",
      "continue": "Fortsätt",
      "back": "Tillbaka",
      "requestQuotes": "Begär 3 offerter",
      "skipFloorPlan": "Hoppa över planritning"
    },
    "vat": "moms"
  },
  "landing": {
    "headline": "Inred ditt nya kontor på en formulär.",
    "subhead": "Berätta vad du behöver. Vi skickar din lista till tre vetted svenska leverantörer — nya och begagnade. Jämför offerter sida vid sida. Välj den bästa. Klart.",
    "stats": { "setupTime": "Genomsnittlig uppstartstid", "suppliers": "Leverantörer i nätverket", "reuseShare": "Andel begagnat" }
  },
  "industry": {
    "title": "Byggt för hur ditt team faktiskt arbetar.",
    "subhead": "Välj din bransch. Vi förinställer rätt utrustning, regelflaggor och leverantörsurval — och skickar din lista till tre vetted partners. Nytt, renoverat eller båda.",
    "avgSpend": "Genomsnittligt pris/plats",
    "reuseShare": "Andel återbrukat",
    "setupTime": "Uppstartstid"
  },
  "project": {
    "basicsTitle": "Projektets grunder",
    "headcount": "Antal anställda",
    "city": "Stad",
    "moveInDate": "Önskat inflyttningsdatum"
  },
  "checklist": {
    "tabs": {
      "workstations": "Arbetsplatser",
      "tech": "Teknik & AV",
      "meeting": "Mötesrum",
      "storage": "Förvaring & säkerhet",
      "lounge": "Lounge & klient",
      "kitchen": "Kök & pausrum"
    },
    "summary": {
      "title": "Din lista",
      "itemsSelected": "Valda artiklar",
      "newUnits": "Nya enheter",
      "usedUnits": "Begagnade enheter",
      "estVat": "Beräknad moms (25%)",
      "total": "Total uppskattning"
    },
    "modes": { "new": "Nytt", "used": "Begagnat" }
  },
  "floorplan": {
    "title": "Din planritning",
    "subhead": "Dra artiklar från listan till ytan. Klicka för att markera och radera.",
    "skip": "Hoppa över planritning"
  },
  "request": {
    "title": "Begär 3 offerter",
    "subhead": "Vi skickar din specifikation till tre vetted leverantörer. Förväntat svar inom 3–4 timmar under arbetstid.",
    "emailLabel": "Din e-postadress",
    "send": "Skicka till 3 leverantörer"
  },
  "confirmation": {
    "title": "Offertförfrågan skickad",
    "subhead": "Projekt-ID:",
    "next": "Vad händer härnäst",
    "step1": "Leverantörerna bekräftar mottagandet",
    "step2": "Offerter levereras inom 3–4 timmar",
    "step3": "Du jämför och väljer"
  }
}
```

Create `src/messages/en.json`:

```json
{
  "common": {
    "appName": "OfficeKit",
    "tagline": "Office equipment, sourced",
    "cta": {
      "start": "Start your office",
      "continue": "Continue",
      "back": "Back",
      "requestQuotes": "Request 3 quotes",
      "skipFloorPlan": "Skip floor plan"
    },
    "vat": "VAT"
  },
  "landing": {
    "headline": "Outfit your new office in one form.",
    "subhead": "Tell us what you need. We send your list to three vetted Swedish suppliers — new and second-hand. Compare quotes side by side. Pick the best one. Done.",
    "stats": { "setupTime": "Avg. setup time", "suppliers": "Suppliers in network", "reuseShare": "Reused furniture share" }
  },
  "industry": {
    "title": "Built for the way your team actually works.",
    "subhead": "Pick your industry. We'll preset the right equipment, compliance flags, and supplier shortlist — then send your list to three vetted partners. New, refurbished, or both.",
    "avgSpend": "Avg. spend / seat",
    "reuseShare": "Reuse share",
    "setupTime": "Setup time"
  },
  "project": {
    "basicsTitle": "Project basics",
    "headcount": "Headcount",
    "city": "City",
    "moveInDate": "Expected move-in date"
  },
  "checklist": {
    "tabs": {
      "workstations": "Workstations",
      "tech": "Tech & AV",
      "meeting": "Meeting rooms",
      "storage": "Storage & security",
      "lounge": "Lounge & client",
      "kitchen": "Kitchen & break"
    },
    "summary": {
      "title": "Your list",
      "itemsSelected": "Items selected",
      "newUnits": "New units",
      "usedUnits": "Reused units",
      "estVat": "Estimated VAT (25%)",
      "total": "Total est."
    },
    "modes": { "new": "New", "used": "Reused" }
  },
  "floorplan": {
    "title": "Your floor plan",
    "subhead": "Drag items from the palette onto the canvas. Click to select and delete.",
    "skip": "Skip floor plan"
  },
  "request": {
    "title": "Request 3 quotes",
    "subhead": "We'll send your spec to three vetted suppliers. Expect a response within 3–4 business hours.",
    "emailLabel": "Your email address",
    "send": "Send to 3 suppliers"
  },
  "confirmation": {
    "title": "Quote request sent",
    "subhead": "Project ID:",
    "next": "What happens next",
    "step1": "Suppliers confirm receipt",
    "step2": "Quotes delivered within 3–4 hours",
    "step3": "You compare and pick"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(i18n): set up next-intl with Swedish default and English fallback"
```

---

### Task 0.11: Base app shell + root layout

**Files:**
- Modify: `src/app/layout.tsx` → move to `src/app/[locale]/layout.tsx`
- Delete: `src/app/page.tsx` (we'll create the locale-aware version in Phase 1)
- Create: `src/components/shell/Header.tsx`, `src/components/shell/Footer.tsx`, `src/app/providers.tsx`

- [ ] **Step 1: Move root layout under [locale]**

```bash
mkdir -p src/app/\[locale\]
mv src/app/layout.tsx src/app/\[locale\]/layout.tsx
rm src/app/page.tsx 2>/dev/null || true
```

- [ ] **Step 2: Rewrite the layout to be locale-aware**

Replace `src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { fraunces, manrope, jetbrains } from "@/lib/fonts";
import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";
import { Providers } from "@/app/providers";
import "@/app/globals.css";

export const metadata = { title: "OfficeKit", description: "A new office, in two days, from one form." };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "sv" | "en")) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <Header />
            <main>{children}</main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Providers (TanStack Query)**

Create `src/app/providers.tsx`:

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Header and Footer**

Create `src/components/shell/Header.tsx`:

```tsx
import { Link } from "@/i18n/routing";

export function Header() {
  return (
    <header style={{ borderBottom: "1px solid var(--color-line)", padding: "16px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <Link href="/" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 28 }}>
        <span style={{ color: "var(--color-ink)" }}>office</span>
        <span style={{ color: "var(--color-terracotta)", fontWeight: 700 }}>kit.</span>
      </Link>
    </header>
  );
}
```

Create `src/components/shell/Footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-line)", padding: "32px", maxWidth: 1280, margin: "64px auto 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
      <p>© {new Date().getFullYear()} OfficeKit · Stockholm · officekit.se</p>
      <p style={{ marginTop: 8 }}>
        <a href="/sv/integritetspolicy">Integritetspolicy</a> · <a href="/sv/partners">Partners</a>
      </p>
    </footer>
  );
}
```

- [ ] **Step 5: Verify the dev server renders**

```bash
pnpm dev
```

Open `http://localhost:3000/sv` — should redirect / route through middleware; expect a 404 on the page (no `/sv/page.tsx` yet) but no crash. Header/footer should render once we add a page in Phase 1.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shell): locale-aware root layout with header, footer, providers"
```

---

## Phase 1 — Buyer happy path

### Task 1.1: Landing page

**Files:**
- Create: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Create the landing page**

Create `src/app/[locale]/page.tsx`:

```tsx
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations();
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
      <p style={{ color: "var(--color-terracotta)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {t("common.tagline")}
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 64, lineHeight: 1.05, marginTop: 16, maxWidth: 720 }}>
        {t("landing.headline")}
      </h1>
      <p style={{ maxWidth: 540, marginTop: 24, color: "var(--color-ink-soft)", fontSize: 18, lineHeight: 1.5 }}>
        {t("landing.subhead")}
      </p>
      <Link
        href="/start"
        style={{
          display: "inline-block",
          marginTop: 32,
          padding: "16px 32px",
          background: "var(--color-terracotta)",
          color: "white",
          textTransform: "uppercase",
          fontSize: 12,
          letterSpacing: "0.1em",
          fontWeight: 600,
          borderRadius: 4,
        }}
      >
        {t("common.cta.start")} →
      </Link>

      <section style={{ marginTop: 96, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
        <Stat label={t("landing.stats.setupTime")} value="11 days → 2" />
        <Stat label={t("landing.stats.suppliers")} value="37 across Sverige" />
        <Stat label={t("landing.stats.reuseShare")} value="Up to 60%" />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-ink-mute)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 8 }}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Visual check**

```bash
pnpm dev
```

Open `http://localhost:3000/sv`. Expect: hero with Swedish copy, terracotta CTA, three stats. Switch to `/en` — expect English copy.

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/page.tsx
git commit -m "feat(buyer): landing page with hero, CTA, and stats"
```

---

### Task 1.2: Industry picker page

**Files:**
- Create: `src/app/[locale]/start/page.tsx`, `src/components/industry/IndustryCard.tsx`

- [ ] **Step 1: Create the card component**

Create `src/components/industry/IndustryCard.tsx`:

```tsx
import { Link } from "@/i18n/routing";
import type { IndustryMeta } from "@/lib/presets";
import { useTranslations } from "next-intl";

export function IndustryCard({ industry, index }: { industry: IndustryMeta; index: number }) {
  const t = useTranslations("industry");
  return (
    <Link
      href={{ pathname: "/projects/new", query: { industry: industry.id } }}
      data-industry={industry.id}
      style={{
        display: "block",
        background: "var(--color-paper)",
        border: "1px solid var(--color-line)",
        borderRadius: 4,
        padding: 32,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <p style={{ color: "var(--color-ink-mute)", fontSize: 12, fontStyle: "italic" }}>— Vertical 0{index + 1}</p>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 16, color: "var(--accent)" }}>{industry.label}</h3>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 12, fontSize: 14 }}>{industry.tagline}</p>
      <hr style={{ border: 0, borderTop: "1px dashed var(--color-line)", margin: "20px 0" }} />
      <dl style={{ display: "grid", gap: 8, fontSize: 13 }}>
        <Row k={t("avgSpend")} v={`${industry.avgSpendPerSeatSek.toLocaleString("sv-SE")} kr`} />
        {industry.complianceFlags && <Row k="Compliance flags" v={industry.complianceFlags.join(", ")} />}
        <Row k={t("reuseShare")} v={industry.reuseShareLabel} />
        <Row k={t("setupTime")} v={industry.setupTimeLabel} />
      </dl>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt>
      <dd style={{ fontWeight: 600 }}>{v}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/[locale]/start/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { INDUSTRIES } from "@/lib/presets";
import { IndustryCard } from "@/components/industry/IndustryCard";

export default async function StartPage() {
  const t = await getTranslations("industry");
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1.1, maxWidth: 720 }}>{t("title")}</h1>
      <p style={{ maxWidth: 600, marginTop: 24, color: "var(--color-ink-soft)", fontSize: 17 }}>{t("subhead")}</p>
      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {INDUSTRIES.map((i, idx) => (
          <IndustryCard key={i.id} industry={i} index={idx} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Visual check**

`pnpm dev`, open `/sv/start`. Expect: 4 cards, each clicking through to `/projects/new?industry=<id>`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(buyer): industry picker page with 4 cards"
```

---

### Task 1.3: claim-token helper (TDD)

**Files:**
- Create: `src/lib/claim-token.ts`
- Test: `tests/unit/claim-token.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/unit/claim-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateClaimToken, isValidClaimToken } from "@/lib/claim-token";

describe("claim-token", () => {
  it("generates a URL-safe token", () => {
    const t = generateClaimToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateClaimToken()));
    expect(tokens.size).toBe(100);
  });

  it("isValidClaimToken rejects empty, short, or non-base64url strings", () => {
    expect(isValidClaimToken("")).toBe(false);
    expect(isValidClaimToken("abc")).toBe(false);
    expect(isValidClaimToken("has spaces inside!!")).toBe(false);
    expect(isValidClaimToken(generateClaimToken())).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
pnpm test claim-token
```

- [ ] **Step 3: Implement**

Create `src/lib/claim-token.ts`:

```ts
import { randomBytes } from "node:crypto";

export const CLAIM_TOKEN_COOKIE = "officekit_claim";
export const CLAIM_TOKEN_TTL_DAYS = 30;

export function generateClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidClaimToken(t: string): boolean {
  return /^[A-Za-z0-9_-]{32,}$/.test(t);
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test claim-token
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(lib): add claim-token generator and validator"
```

---

### Task 1.4: POST /api/v1/projects (create project + ghost company)

**Files:**
- Create: `src/app/api/v1/projects/route.ts`, `src/server/projects.ts`

- [ ] **Step 1: Server logic**

Create `src/server/projects.ts`:

```ts
import { db } from "@/lib/db";
import { computeQuantity } from "@/lib/presets";
import { generateClaimToken } from "@/lib/claim-token";
import type { Industry } from "@prisma/client";

export interface CreateProjectInput {
  industry: Industry;
  headcount: number;
  city: string;
  moveInDate?: Date | null;
  companyName: string;
}

export async function createProjectWithGhostCompany(input: CreateProjectInput) {
  const claimToken = generateClaimToken();

  const project = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: input.companyName, claimToken, createdByUserId: null },
    });
    const project = await tx.project.create({
      data: {
        companyId: company.id,
        claimToken,
        createdByUserId: null,
        name: `${input.companyName} — ${input.city}`,
        industry: input.industry,
        headcount: input.headcount,
        city: input.city,
        moveInDate: input.moveInDate ?? null,
        status: "draft",
      },
    });

    // Pre-populate project_items from catalog presets
    const catalog = await tx.itemCatalog.findMany();
    const itemsToCreate = catalog
      .map((c) => ({
        itemId: c.id,
        quantity: computeQuantity(c.presets as Record<Industry, number>, input.industry, input.headcount),
      }))
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        projectId: project.id,
        itemId: row.itemId,
        quantity: row.quantity,
        mode: "new" as const,
      }));
    if (itemsToCreate.length) {
      await tx.projectItem.createMany({ data: itemsToCreate });
    }

    return project;
  });

  return { project, claimToken };
}
```

- [ ] **Step 2: API route**

Create `src/app/api/v1/projects/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createProjectWithGhostCompany } from "@/server/projects";
import { CLAIM_TOKEN_COOKIE, CLAIM_TOKEN_TTL_DAYS } from "@/lib/claim-token";

const schema = z.object({
  industry: z.enum(["it", "finance", "sales", "law"]),
  headcount: z.number().int().min(1).max(500),
  city: z.string().min(1).max(80),
  moveInDate: z.string().datetime().optional().nullable(),
  companyName: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const { project, claimToken } = await createProjectWithGhostCompany({
    ...input,
    moveInDate: input.moveInDate ? new Date(input.moveInDate) : null,
  });
  const jar = await cookies();
  jar.set(CLAIM_TOKEN_COOKIE, claimToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CLAIM_TOKEN_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return NextResponse.json({ id: project.id });
}
```

- [ ] **Step 3: Manual check**

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "content-type: application/json" \
  -d '{"industry":"law","headcount":12,"city":"Stockholm","companyName":"Acme Advokatbyrå"}'
```

Expected: `{ "id": "<uuid>" }`. Verify in `pnpm db:studio` that a project, company, and ~10 project_items exist.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): POST /projects creates project with ghost company and presets"
```

---

### Task 1.5: GET /api/v1/projects/:id

**Files:**
- Create: `src/app/api/v1/projects/[id]/route.ts`, `src/server/project-summary.ts`

- [ ] **Step 1: Summary computation**

Create `src/server/project-summary.ts`:

```ts
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import { addVat, VAT_RATE } from "@/lib/money";

export interface ProjectSummary {
  itemsSelected: number;
  newUnits: number;
  usedUnits: number;
  subtotalOre: number;       // ex VAT
  vatOre: number;
  totalOre: number;          // inc VAT
}

export function computeSummary(items: (ProjectItem & { item: ItemCatalog })[]): ProjectSummary {
  let newUnits = 0, usedUnits = 0, subtotalOre = 0;
  for (const row of items) {
    if (row.mode === "new") newUnits += row.quantity;
    else usedUnits += row.quantity;
    const unit = row.mode === "new" ? row.item.priceNewDefault : (row.item.priceUsedDefault ?? row.item.priceNewDefault);
    subtotalOre += unit * row.quantity;
  }
  const totalOre = addVat(subtotalOre);
  return {
    itemsSelected: items.reduce((n, r) => n + r.quantity, 0),
    newUnits,
    usedUnits,
    subtotalOre,
    vatOre: totalOre - subtotalOre,
    totalOre,
  };
}

export { VAT_RATE };
```

- [ ] **Step 2: Authz helper**

Append to `src/server/projects.ts`:

```ts
import { cookies } from "next/headers";
import { CLAIM_TOKEN_COOKIE } from "@/lib/claim-token";
import { auth } from "@/lib/auth";

export async function getAuthorizedProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { items: { include: { item: true } } },
  });
  if (!project) return null;

  const session = await auth();
  if (project.createdByUserId && session?.user?.id === project.createdByUserId) return project;

  const jar = await cookies();
  const cookieToken = jar.get(CLAIM_TOKEN_COOKIE)?.value;
  if (project.claimToken && cookieToken === project.claimToken) return project;

  return null;
}
```

- [ ] **Step 3: Route**

Create `src/app/api/v1/projects/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found_or_unauthorized" }, { status: 404 });
  const summary = computeSummary(project.items);
  return NextResponse.json({ project, summary });
}
```

- [ ] **Step 4: Manual check**

Reuse the project ID from the previous curl. `curl http://localhost:3000/api/v1/projects/<id>` should 404 (no cookie). With the cookie set by the POST, it should return project + summary.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): GET /projects/:id with claim-token or session auth"
```

---

### Task 1.6: PATCH/DELETE /api/v1/projects/:id/items/:lineId

**Files:**
- Create: `src/app/api/v1/projects/[id]/items/[lineId]/route.ts`
- Create: `src/app/api/v1/projects/[id]/items/route.ts` (POST)

- [ ] **Step 1: PATCH/DELETE handler**

Create `src/app/api/v1/projects/[id]/items/[lineId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

const patchSchema = z.object({
  quantity: z.number().int().min(0).max(9999).optional(),
  mode: z.enum(["new", "used"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.quantity === 0) {
    await db.projectItem.delete({ where: { id: lineId } });
  } else {
    await db.projectItem.update({ where: { id: lineId }, data: parsed.data });
  }

  const updated = await db.project.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { item: true } } },
  });
  return NextResponse.json({ summary: computeSummary(updated.items), items: updated.items });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.projectItem.delete({ where: { id: lineId } });
  const updated = await db.project.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { item: true } } },
  });
  return NextResponse.json({ summary: computeSummary(updated.items), items: updated.items });
}
```

- [ ] **Step 2: POST for adding an item not yet in the list**

Create `src/app/api/v1/projects/[id]/items/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

const schema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(9999),
  mode: z.enum(["new", "used"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.projectItem.upsert({
    where: { projectId_itemId: { projectId: id, itemId: parsed.data.itemId } },
    create: { projectId: id, ...parsed.data },
    update: { quantity: parsed.data.quantity, mode: parsed.data.mode },
  });
  const updated = await db.project.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { item: true } } },
  });
  return NextResponse.json({ summary: computeSummary(updated.items), items: updated.items });
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): mutate project items, recompute summary on every change"
```

---

### Task 1.7: Project basics form

**Files:**
- Create: `src/app/[locale]/projects/new/page.tsx`

- [ ] **Step 1: Form page (client component)**

Create `src/app/[locale]/projects/new/page.tsx`:

```tsx
"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const CITIES = ["Stockholm", "Göteborg", "Malmö", "Uppsala", "Västerås", "Linköping", "Örebro", "Norrköping", "Helsingborg", "Jönköping"];

export default function NewProjectPage() {
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const industry = sp.get("industry") ?? "it";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        industry,
        headcount: Number(fd.get("headcount")),
        city: String(fd.get("city")),
        moveInDate: fd.get("moveInDate") ? new Date(String(fd.get("moveInDate"))).toISOString() : null,
        companyName: String(fd.get("companyName")),
      }),
    });
    if (!res.ok) {
      setError("Couldn't create project. Please check your input.");
      setSubmitting(false);
      return;
    }
    const { id } = await res.json();
    router.push(`/projects/${id}/checklist`);
  }

  return (
    <div data-industry={industry} style={{ maxWidth: 560, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("project.basicsTitle")}</h1>
      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 24 }}>
        <Field label="Company name" name="companyName" required />
        <Field label={t("project.headcount")} name="headcount" type="number" min={1} max={500} required />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("project.city")}</span>
          <select name="city" required style={inputStyle}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <Field label={t("project.moveInDate")} name="moveInDate" type="date" />
        {error && <p style={{ color: "var(--color-terracotta)" }}>{error}</p>}
        <button type="submit" disabled={submitting} style={ctaStyle}>
          {submitting ? "…" : `${t("common.cta.continue")} →`}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-cream)",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 14,
};

const ctaStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  padding: "16px 24px",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: 12,
  fontWeight: 600,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{label}</span>
      <input {...rest} style={inputStyle} />
    </label>
  );
}
```

- [ ] **Step 2: Visual check**

Click through `/sv/start` → an industry card → fill the form → submit. Expect redirect to `/sv/projects/<uuid>/checklist`. (The checklist page doesn't exist yet — 404 is OK at this point.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(buyer): project basics form posts to /api/v1/projects"
```

---

### Task 1.8: Catalog GET endpoint

**Files:**
- Create: `src/app/api/v1/catalog/items/route.ts`

- [ ] **Step 1: Route**

Create `src/app/api/v1/catalog/items/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.itemCatalog.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json({ items });
}

export const revalidate = 300;
```

- [ ] **Step 2: Manual check**

```bash
curl http://localhost:3000/api/v1/catalog/items | jq '.items | length'
```

Expected: 36 (matches the seed).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): GET /catalog/items with 5min ISR cache"
```

---

### Task 1.9: Checklist page (server-rendered shell + client controls)

**Files:**
- Create: `src/app/[locale]/projects/[id]/checklist/page.tsx`, `src/components/checklist/ChecklistView.tsx`, `src/components/checklist/CategoryTabs.tsx`, `src/components/checklist/ItemRow.tsx`, `src/components/checklist/SummarySidebar.tsx`

- [ ] **Step 1: Server-side page entry**

Create `src/app/[locale]/projects/[id]/checklist/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";
import { ChecklistView } from "@/components/checklist/ChecklistView";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const catalog = await db.itemCatalog.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const summary = computeSummary(project.items);
  return <ChecklistView project={project} catalog={catalog} initialSummary={summary} />;
}
```

- [ ] **Step 2: Client view**

Create `src/components/checklist/ChecklistView.tsx`:

```tsx
"use client";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ItemCatalog, Project, ProjectItem } from "@prisma/client";
import { CategoryTabs } from "./CategoryTabs";
import { ItemRow } from "./ItemRow";
import { SummarySidebar } from "./SummarySidebar";
import type { ProjectSummary } from "@/server/project-summary";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

type ProjectWithItems = Project & { items: (ProjectItem & { item: ItemCatalog })[] };
type Category = ItemCatalog["category"];

export function ChecklistView({
  project,
  catalog,
  initialSummary,
}: {
  project: ProjectWithItems;
  catalog: ItemCatalog[];
  initialSummary: ProjectSummary;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<Category>("workstations");
  const [items, setItems] = useState(project.items);
  const [summary, setSummary] = useState(initialSummary);
  const qc = useQueryClient();

  const byCategory = useMemo(() => {
    const map = new Map<Category, ItemCatalog[]>();
    for (const c of catalog) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return map;
  }, [catalog]);

  const lineFor = (itemId: string) => items.find((l) => l.itemId === itemId);

  const upsertMut = useMutation({
    mutationFn: async (input: { itemId: string; quantity: number; mode: "new" | "used" }) => {
      const res = await fetch(`/api/v1/projects/${project.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("upsert failed");
      return res.json() as Promise<{ summary: ProjectSummary; items: typeof items }>;
    },
    onSuccess: (data) => { setItems(data.items); setSummary(data.summary); },
  });

  const patchMut = useMutation({
    mutationFn: async (input: { lineId: string; quantity?: number; mode?: "new" | "used" }) => {
      const { lineId, ...patch } = input;
      const res = await fetch(`/api/v1/projects/${project.id}/items/${lineId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("patch failed");
      return res.json() as Promise<{ summary: ProjectSummary; items: typeof items }>;
    },
    onSuccess: (data) => { setItems(data.items); setSummary(data.summary); },
  });

  const onQuantity = (catalogItem: ItemCatalog, qty: number) => {
    const line = lineFor(catalogItem.id);
    if (line) patchMut.mutate({ lineId: line.id, quantity: qty });
    else if (qty > 0) upsertMut.mutate({ itemId: catalogItem.id, quantity: qty, mode: "new" });
  };

  const onMode = (catalogItem: ItemCatalog, mode: "new" | "used") => {
    const line = lineFor(catalogItem.id);
    if (line) patchMut.mutate({ lineId: line.id, mode });
    else upsertMut.mutate({ itemId: catalogItem.id, quantity: 1, mode });
  };

  return (
    <div data-industry={project.industry} style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 48 }}>
      <div>
        <CategoryTabs active={tab} onChange={setTab} />
        <div style={{ marginTop: 32 }}>
          {(byCategory.get(tab) ?? []).map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              line={lineFor(item.id)}
              onQuantity={(q) => onQuantity(item, q)}
              onMode={(m) => onMode(item, m)}
            />
          ))}
        </div>
      </div>
      <div>
        <SummarySidebar summary={summary} city={project.city} />
        <Link
          href={`/projects/${project.id}/floorplan`}
          style={{ display: "block", textAlign: "center", marginTop: 16, padding: 16, background: "var(--accent)", color: "white", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 600, textDecoration: "none", borderRadius: 4 }}
        >
          Continue to floor plan →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Tab strip**

Create `src/components/checklist/CategoryTabs.tsx`:

```tsx
"use client";
import { useTranslations } from "next-intl";
import type { ItemCatalog } from "@prisma/client";

const CATEGORIES: ItemCatalog["category"][] = ["workstations", "tech", "meeting", "storage", "lounge", "kitchen"];

export function CategoryTabs({ active, onChange }: { active: ItemCatalog["category"]; onChange: (c: ItemCatalog["category"]) => void }) {
  const t = useTranslations("checklist.tabs");
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            padding: "8px 18px",
            borderRadius: 100,
            border: "1px solid var(--color-line)",
            background: active === c ? "var(--color-ink)" : "transparent",
            color: active === c ? "white" : "var(--color-ink)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t(c)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Item row**

Create `src/components/checklist/ItemRow.tsx`:

```tsx
"use client";
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import { formatSek } from "@/lib/money";

export function ItemRow({
  item,
  line,
  onQuantity,
  onMode,
}: {
  item: ItemCatalog;
  line: (ProjectItem & { item: ItemCatalog }) | undefined;
  onQuantity: (q: number) => void;
  onMode: (m: "new" | "used") => void;
}) {
  const qty = line?.quantity ?? 0;
  const mode = line?.mode ?? "new";
  const unitOre = mode === "new" ? item.priceNewDefault : (item.priceUsedDefault ?? item.priceNewDefault);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 200px 140px 100px", gap: 16, alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--color-line)" }}>
      <div style={{ fontSize: 28 }}>{item.icon}</div>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600 }}>{item.name}</h4>
        <p style={{ margin: "4px 0 0", color: "var(--color-ink-mute)", fontSize: 13 }}>{item.description}</p>
        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.tags.map((tg) => (
            <span key={tg} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-green-leaf)" }}>{tg}</span>
          ))}
        </div>
      </div>
      <ModeToggle mode={mode} onChange={onMode} usedAvailable={item.priceUsedDefault !== null} />
      <Stepper value={qty} onChange={onQuantity} />
      <div style={{ textAlign: "right", color: "var(--color-ink-mute)", fontSize: 13 }}>{formatSek(unitOre)} / ea</div>
    </div>
  );
}

function ModeToggle({ mode, onChange, usedAvailable }: { mode: "new" | "used"; onChange: (m: "new" | "used") => void; usedAvailable: boolean }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--color-line)", borderRadius: 100 }}>
      {(["new", "used"] as const).map((m) => (
        <button
          key={m}
          disabled={m === "used" && !usedAvailable}
          onClick={() => onChange(m)}
          style={{
            padding: "6px 14px",
            border: "none",
            background: mode === m ? "var(--color-ink)" : "transparent",
            color: mode === m ? "white" : "var(--color-ink-mute)",
            borderRadius: 100,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: m === "used" && !usedAvailable ? "not-allowed" : "pointer",
            opacity: m === "used" && !usedAvailable ? 0.4 : 1,
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, border: "1px solid var(--color-line)", borderRadius: 100, padding: "4px 12px" }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={btn}>−</button>
      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btn}>+</button>
    </div>
  );
}
const btn: React.CSSProperties = { border: "none", background: "transparent", fontSize: 16, cursor: "pointer", width: 24, color: "var(--color-ink-soft)" };
```

- [ ] **Step 5: Summary sidebar**

Create `src/components/checklist/SummarySidebar.tsx`:

```tsx
"use client";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import type { ProjectSummary } from "@/server/project-summary";

export function SummarySidebar({ summary, city }: { summary: ProjectSummary; city: string }) {
  const t = useTranslations("checklist.summary");
  return (
    <aside style={{ border: "1px solid var(--color-line)", borderRadius: 4, padding: 32, background: "var(--color-paper)" }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>Your office in</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 8 }}>{city}, SE</h2>
      <dl style={{ marginTop: 24, display: "grid", gap: 12, fontSize: 14 }}>
        <Row k={t("itemsSelected")} v={String(summary.itemsSelected)} />
        <Row k={t("newUnits")} v={String(summary.newUnits)} />
        <Row k={t("usedUnits")} v={String(summary.usedUnits)} />
        <Row k={t("estVat")} v={formatSek(summary.vatOre)} />
      </dl>
      <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "20px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{t("total")}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-terracotta)" }}>{formatSek(summary.totalOre)}</span>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-line)", paddingBottom: 8 }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
```

- [ ] **Step 6: Visual check**

Go through `/sv` → start → fill form → land on checklist. Expect: category tabs, pre-populated items with quantities, working steppers, live-updating summary, and a "Continue to floor plan" CTA.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(buyer): checklist page with tabs, item rows, summary"
```

---

### Task 1.10: Floor plan placeholder + skip path

**Files:**
- Create: `src/app/[locale]/projects/[id]/floorplan/page.tsx` (placeholder — full impl in Phase 2)

- [ ] **Step 1: Stub the route so Phase 1 ends at a clickable destination**

Create `src/app/[locale]/projects/[id]/floorplan/page.tsx`:

```tsx
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { getTranslations } from "next-intl/server";

export default async function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const t = await getTranslations();
  return (
    <div data-industry={project.industry} style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("floorplan.title")}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 16 }}>Coming in Phase 2. For now you can proceed without one.</p>
      <Link
        href={`/projects/${id}/request`}
        style={{ display: "inline-block", marginTop: 32, padding: "16px 24px", background: "var(--accent)", color: "white", textTransform: "uppercase", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textDecoration: "none", borderRadius: 4 }}
      >
        {t("common.cta.requestQuotes")} →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(buyer): floor plan placeholder route, Phase 2 will replace"
```

---

### Task 1.11: Request page (auth wall + RFQ fanout stub)

**Files:**
- Create: `src/app/[locale]/projects/[id]/request/page.tsx`, `src/app/api/v1/projects/[id]/request-quotes/route.ts`, `src/server/rfq-fanout.ts`, `src/server/claim.ts`, `src/emails/QuoteRequestConfirmation.tsx`

- [ ] **Step 1: Claim helper (used by NextAuth `events.signIn`)**

Create `src/server/claim.ts`:

```ts
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CLAIM_TOKEN_COOKIE } from "@/lib/claim-token";

export async function claimAnonymousProjects(userId: string) {
  const jar = await cookies();
  const token = jar.get(CLAIM_TOKEN_COOKIE)?.value;
  if (!token) return;

  await db.$transaction([
    db.company.updateMany({ where: { claimToken: token }, data: { createdByUserId: userId, claimToken: null } }),
    db.project.updateMany({ where: { claimToken: token }, data: { createdByUserId: userId, claimToken: null } }),
  ]);

  jar.delete(CLAIM_TOKEN_COOKIE);
}
```

- [ ] **Step 2: RFQ fanout server logic**

Create `src/server/rfq-fanout.ts`:

```ts
import { db } from "@/lib/db";
import { addHours } from "date-fns";

export async function fanoutRfqs(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { company: true, items: true },
  });

  // Pick 3 active suppliers that cover the project's vertical (or fallback to any).
  const all = await db.supplier.findMany({ where: { active: true } });
  const matching = all.filter((s) => s.verticals.includes(project.industry));
  const chosen = (matching.length >= 3 ? matching : all).slice(0, 3);
  if (chosen.length < 1) throw new Error("no_suppliers");

  const deadline = addHours(new Date(), 4);
  const rfqs = await db.$transaction(
    chosen.map((s) =>
      db.rfq.upsert({
        where: { projectId_supplierId: { projectId, supplierId: s.id } },
        update: { status: "sent", sentAt: new Date(), deadlineAt: deadline },
        create: { projectId, supplierId: s.id, status: "sent", deadlineAt: deadline },
      }),
    ),
  );

  await db.project.update({ where: { id: projectId }, data: { status: "requesting_quotes" } });
  return rfqs;
}
```

- [ ] **Step 3: Confirmation email**

Create `src/emails/QuoteRequestConfirmation.tsx`:

```tsx
import { Body, Container, Heading, Html, Text } from "@react-email/components";

export function QuoteRequestConfirmationEmail({ projectId, locale }: { projectId: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Din offertförfrågan är skickad", body: "Vi har skickat din spec till tre leverantörer. Du får svar inom 3–4 timmar.", id: "Projekt-ID:" }
    : { heading: "Your quote request is on its way", body: "We've sent your spec to three suppliers. Expect replies within 3–4 hours.", id: "Project ID:" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", marginTop: 24 }}>{t.id} <strong>{projectId}</strong></Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Request-quotes endpoint**

Create `src/app/api/v1/projects/[id]/request-quotes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { fanoutRfqs } from "@/server/rfq-fanout";
import { getAuthorizedProject } from "@/server/projects";
import { Resend } from "resend";
import { QuoteRequestConfirmationEmail } from "@/emails/QuoteRequestConfirmation";

const schema = z.object({ email: z.string().email().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = await auth();
  if (!session?.user?.id) {
    // unauthenticated — caller should redirect to magic-link flow with email below
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success || !parsed.data.email) {
      return NextResponse.json({ error: "email_required" }, { status: 401 });
    }
    // Trigger the NextAuth magic-link flow programmatically
    await signIn("resend", { email: parsed.data.email, redirectTo: `/sv/projects/${id}/confirmation`, redirect: false });
    return NextResponse.json({ status: "magic_link_sent" });
  }

  // Authenticated — make sure the project belongs to this user (claim if needed)
  if (project.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await fanoutRfqs(id);
  const resend = new Resend(process.env.RESEND_API_KEY!);
  if (session.user.email) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: session.user.email,
      subject: "OfficeKit — quote request sent",
      react: QuoteRequestConfirmationEmail({ projectId: id, locale: (session.user as any).locale ?? "sv" }),
    });
  }
  return NextResponse.json({ status: "sent" });
}
```

- [ ] **Step 5: Request page**

Create `src/app/[locale]/projects/[id]/request/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";
import { RequestForm } from "@/components/buyer/RequestForm";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const summary = computeSummary(project.items);
  const t = await getTranslations();
  return (
    <div data-industry={project.industry} style={{ maxWidth: 720, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("request.title")}</h1>
      <p style={{ marginTop: 16, color: "var(--color-ink-soft)" }}>{t("request.subhead")}</p>
      <dl style={{ marginTop: 32, display: "grid", gap: 12, fontSize: 14 }}>
        <Row k="Industry" v={project.industry} />
        <Row k="Headcount" v={String(project.headcount)} />
        <Row k="Location" v={project.city} />
        <Row k="Items" v={String(summary.itemsSelected)} />
        <Row k="Estimated total" v={formatSek(summary.totalOre)} />
      </dl>
      <RequestForm projectId={id} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-line)", paddingBottom: 8 }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt><dd>{v}</dd>
    </div>
  );
}
```

Create `src/components/buyer/RequestForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function RequestForm({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "magic_sent" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch(`/api/v1/projects/${projectId}/request-quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.status === "magic_link_sent") setState("magic_sent");
    else if (data.status === "sent") { setState("sent"); router.push(`/projects/${projectId}/confirmation`); }
    else setState("error");
  }

  if (state === "magic_sent") {
    return <p style={{ marginTop: 32, color: "var(--color-forest)" }}>Check your inbox — we sent a sign-in link to {email}. Click it to finish sending the request.</p>;
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("request.emailLabel")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }}
        />
      </label>
      <button type="submit" disabled={state === "sending"} style={{ background: "var(--color-terracotta)", color: "white", padding: "16px 24px", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 4, cursor: "pointer" }}>
        {state === "sending" ? "…" : `${t("request.send")} →`}
      </button>
      {state === "error" && <p style={{ color: "var(--color-terracotta)" }}>Something went wrong. Try again.</p>}
    </form>
  );
}
```

- [ ] **Step 6: Confirmation page**

Create `src/app/[locale]/projects/[id]/confirmation/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { getTranslations } from "next-intl/server";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const t = await getTranslations("confirmation");
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("title")}</h1>
      <p style={{ marginTop: 16, color: "var(--color-ink-soft)" }}>{t("subhead")}</p>
      <p style={{ marginTop: 8, fontFamily: "var(--font-mono)" }}>{id}</p>
      <h3 style={{ marginTop: 48, fontFamily: "var(--font-display)" }}>{t("next")}</h3>
      <ol style={{ marginTop: 16, textAlign: "left", color: "var(--color-ink-soft)" }}>
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
        <li>{t("step3")}</li>
      </ol>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(buyer): request page + RFQ fanout stub + claim flow + confirmation"
```

---

### Task 1.12: Orders stub page

**Files:**
- Create: `src/app/[locale]/orders/page.tsx`

- [ ] **Step 1: Empty-state page**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/routing";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
      <p style={{ fontSize: 64 }}>📦</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 16 }}>No orders yet</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>Your placed orders will appear here once you accept a quote.</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(buyer): orders stub page with empty state"
```

---

## Phase 2 — Floor plan

### Task 2.1: Room presets (TDD)

**Files:**
- Create: `src/lib/room-presets.ts`
- Test: `tests/unit/room-presets.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { getRoomsForIndustry } from "@/lib/room-presets";

describe("room-presets", () => {
  it("returns at least 4 rooms for each industry", () => {
    for (const ind of ["it", "finance", "sales", "law"] as const) {
      expect(getRoomsForIndustry(ind).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("rooms have non-overlapping rectangles in the law preset", () => {
    const rooms = getRoomsForIndustry("law");
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i]!, b = rooms[j]!;
        const overlaps = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlaps).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Industry } from "@prisma/client";

export interface RoomOutline {
  id: string;
  label: string;
  x: number;  // grid cells
  y: number;
  w: number;
  h: number;
}

const LAW: RoomOutline[] = [
  { id: "reception", label: "Reception", x: 0, y: 0, w: 7, h: 5 },
  { id: "boardroom", label: "Boardroom", x: 7, y: 0, w: 8, h: 6 },
  { id: "offices", label: "Private offices", x: 0, y: 5, w: 7, h: 6 },
  { id: "archive", label: "Archive", x: 15, y: 0, w: 7, h: 4 },
  { id: "kitchen", label: "Kitchen", x: 15, y: 4, w: 7, h: 4 },
  { id: "phone-booths", label: "Phone booths", x: 7, y: 6, w: 4, h: 5 },
];

const IT: RoomOutline[] = [
  { id: "open-work", label: "Open work", x: 0, y: 0, w: 14, h: 8 },
  { id: "phone-booths", label: "Phone booths", x: 14, y: 0, w: 4, h: 6 },
  { id: "meeting", label: "Meeting room", x: 18, y: 0, w: 4, h: 4 },
  { id: "kitchen", label: "Kitchen", x: 14, y: 6, w: 4, h: 5 },
  { id: "lounge", label: "Lounge", x: 18, y: 4, w: 4, h: 5 },
];

const FINANCE: RoomOutline[] = [
  { id: "reception", label: "Reception", x: 0, y: 0, w: 6, h: 4 },
  { id: "boardroom", label: "Boardroom", x: 6, y: 0, w: 8, h: 5 },
  { id: "open-work", label: "Open work", x: 0, y: 4, w: 14, h: 7 },
  { id: "secure-storage", label: "Secure storage", x: 14, y: 0, w: 4, h: 5 },
  { id: "kitchen", label: "Kitchen", x: 14, y: 5, w: 4, h: 5 },
];

const SALES: RoomOutline[] = [
  { id: "open-work", label: "Open work", x: 0, y: 0, w: 16, h: 8 },
  { id: "phone-booths", label: "Phone booths", x: 16, y: 0, w: 4, h: 6 },
  { id: "meeting", label: "Meeting", x: 0, y: 8, w: 8, h: 3 },
  { id: "kitchen", label: "Kitchen", x: 8, y: 8, w: 8, h: 3 },
  { id: "lounge", label: "Lounge", x: 16, y: 6, w: 4, h: 5 },
];

const MAP: Record<Industry, RoomOutline[]> = { law: LAW, it: IT, finance: FINANCE, sales: SALES };

export function getRoomsForIndustry(industry: Industry): RoomOutline[] {
  return MAP[industry];
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test room-presets
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(lib): room-preset rectangles per industry"
```

---

### Task 2.2: Floor plan reducer (TDD)

**Files:**
- Create: `src/components/floorplan/state.ts`
- Test: `tests/unit/floorplan-state.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from "vitest";
import { reducer, type FloorState, initialState } from "@/components/floorplan/state";

const seed: FloorState = initialState({ width: 22, height: 15 }, []);

describe("floorplan reducer", () => {
  it("places an item at a snapped cell", () => {
    const s = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 3.7, y: 2.4 });
    expect(s.placed).toHaveLength(1);
    expect(s.placed[0]).toMatchObject({ itemId: "desk-electric", x: 4, y: 2 });
  });

  it("clamps placement within canvas bounds", () => {
    const s = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 100, y: 100 });
    expect(s.placed[0]!.x).toBeLessThanOrEqual(22);
    expect(s.placed[0]!.y).toBeLessThanOrEqual(15);
  });

  it("removes a placed item by uid", () => {
    const placed = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 0, y: 0 });
    const removed = reducer(placed, { type: "REMOVE", uid: placed.placed[0]!.uid });
    expect(removed.placed).toHaveLength(0);
  });

  it("moves a placed item by uid with snap", () => {
    const placed = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 0, y: 0 });
    const moved = reducer(placed, { type: "MOVE", uid: placed.placed[0]!.uid, x: 5.5, y: 3.5 });
    expect(moved.placed[0]).toMatchObject({ x: 6, y: 4 });
  });

  it("selects and clears selection", () => {
    const placed = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 0, y: 0 });
    const selected = reducer(placed, { type: "SELECT", uid: placed.placed[0]!.uid });
    expect(selected.selectedUid).toBe(placed.placed[0]!.uid);
    const cleared = reducer(selected, { type: "SELECT", uid: null });
    expect(cleared.selectedUid).toBe(null);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { ItemMode } from "@prisma/client";

export interface PlacedItem {
  uid: number;
  itemId: string;
  x: number;
  y: number;
  mode: ItemMode;
}

export interface FloorState {
  canvas: { width: number; height: number };
  placed: PlacedItem[];
  selectedUid: number | null;
  nextUid: number;
}

export type Action =
  | { type: "PLACE"; itemId: string; x: number; y: number; mode?: ItemMode }
  | { type: "MOVE"; uid: number; x: number; y: number }
  | { type: "REMOVE"; uid: number }
  | { type: "SELECT"; uid: number | null }
  | { type: "HYDRATE"; placed: PlacedItem[]; nextUid: number };

const snap = (n: number) => Math.round(n);
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

export function initialState(canvas: { width: number; height: number }, placed: PlacedItem[]): FloorState {
  return {
    canvas,
    placed,
    selectedUid: null,
    nextUid: placed.reduce((m, p) => Math.max(m, p.uid), 0) + 1,
  };
}

export function reducer(s: FloorState, a: Action): FloorState {
  switch (a.type) {
    case "PLACE": {
      const x = clamp(snap(a.x), s.canvas.width);
      const y = clamp(snap(a.y), s.canvas.height);
      return { ...s, placed: [...s.placed, { uid: s.nextUid, itemId: a.itemId, x, y, mode: a.mode ?? "new" }], nextUid: s.nextUid + 1 };
    }
    case "MOVE": {
      const x = clamp(snap(a.x), s.canvas.width);
      const y = clamp(snap(a.y), s.canvas.height);
      return { ...s, placed: s.placed.map((p) => (p.uid === a.uid ? { ...p, x, y } : p)) };
    }
    case "REMOVE":
      return { ...s, placed: s.placed.filter((p) => p.uid !== a.uid), selectedUid: s.selectedUid === a.uid ? null : s.selectedUid };
    case "SELECT":
      return { ...s, selectedUid: a.uid };
    case "HYDRATE":
      return { ...s, placed: a.placed, nextUid: a.nextUid };
  }
}
```

- [ ] **Step 3: Run, expect pass; commit**

```bash
pnpm test floorplan-state
git add -A
git commit -m "feat(floorplan): pure reducer with snap, clamp, select, remove"
```

---

### Task 2.3: Floor plan canvas + palette + page

**Files:**
- Create: `src/components/floorplan/Canvas.tsx`, `src/components/floorplan/Palette.tsx`, `src/components/floorplan/PlacedItem.tsx`, `src/components/floorplan/FloorPlanView.tsx`
- Modify: `src/app/[locale]/projects/[id]/floorplan/page.tsx` (replace placeholder)

- [ ] **Step 1: View shell**

Create `src/components/floorplan/FloorPlanView.tsx`:

```tsx
"use client";
import { useEffect, useReducer, useMemo } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import type { ItemCatalog, Project, ProjectItem } from "@prisma/client";
import { reducer, initialState, type PlacedItem } from "./state";
import { Canvas } from "./Canvas";
import { Palette } from "./Palette";
import { getRoomsForIndustry } from "@/lib/room-presets";
import { Link } from "@/i18n/routing";

const CELL_PX = 32;

type ProjectWithItems = Project & { items: (ProjectItem & { item: ItemCatalog })[] };

export function FloorPlanView({ project }: { project: ProjectWithItems }) {
  const initialPlaced: PlacedItem[] = useMemo(() => {
    const fp = (project.floorPlanData as { placed_items?: any[] } | null) ?? {};
    return (fp.placed_items ?? []).map((p, idx) => ({ uid: p.uid ?? idx + 1, itemId: p.item_id, x: p.x, y: p.y, mode: p.mode ?? "new" }));
  }, [project.floorPlanData]);

  const [state, dispatch] = useReducer(reducer, initialState({ width: 22, height: 15 }, initialPlaced));
  const rooms = getRoomsForIndustry(project.industry);

  // Debounced autosave
  useEffect(() => {
    const handle = setTimeout(async () => {
      await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          floorPlanData: {
            canvas: { width_cells: state.canvas.width, height_cells: state.canvas.height },
            rooms,
            placed_items: state.placed.map((p) => ({ uid: p.uid, item_id: p.itemId, x: p.x, y: p.y, mode: p.mode })),
          },
        }),
      });
    }, 1000);
    return () => clearTimeout(handle);
  }, [state.placed, project.id]);

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    if (id.startsWith("palette:")) {
      const itemId = id.slice("palette:".length);
      const rect = (e.over?.rect as DOMRect | undefined);
      const dropX = e.activatorEvent && "clientX" in e.activatorEvent ? (e.activatorEvent as MouseEvent).clientX : 0;
      const dropY = e.activatorEvent && "clientY" in e.activatorEvent ? (e.activatorEvent as MouseEvent).clientY : 0;
      const cx = rect ? (dropX + e.delta.x - rect.left) / CELL_PX : 0;
      const cy = rect ? (dropY + e.delta.y - rect.top) / CELL_PX : 0;
      dispatch({ type: "PLACE", itemId, x: cx, y: cy });
    } else if (id.startsWith("placed:")) {
      const uid = Number(id.slice("placed:".length));
      const placed = state.placed.find((p) => p.uid === uid);
      if (!placed) return;
      dispatch({ type: "MOVE", uid, x: placed.x + e.delta.x / CELL_PX, y: placed.y + e.delta.y / CELL_PX });
    }
  }

  return (
    <DndContext modifiers={[restrictToParentElement]} onDragEnd={onDragEnd}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, maxWidth: 1280, margin: "0 auto", padding: 32 }}>
        <Palette projectItems={project.items} placed={state.placed} />
        <div>
          <Canvas state={state} rooms={rooms} cellPx={CELL_PX} catalog={project.items.map((i) => i.item)} dispatch={dispatch} />
          <Link
            href={`/projects/${project.id}/request`}
            style={{ display: "inline-block", marginTop: 24, padding: "16px 24px", background: "var(--accent)", color: "white", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 600, borderRadius: 4, textDecoration: "none" }}
          >
            Request 3 quotes →
          </Link>
        </div>
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 2: Palette**

```tsx
"use client";
import { useDraggable } from "@dnd-kit/core";
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import type { PlacedItem } from "./state";

export function Palette({ projectItems, placed }: { projectItems: (ProjectItem & { item: ItemCatalog })[]; placed: PlacedItem[] }) {
  const placedCount = (itemId: string) => placed.filter((p) => p.itemId === itemId).length;
  return (
    <aside style={{ border: "1px solid var(--color-line)", borderRadius: 4, padding: 16, background: "var(--color-paper)", maxHeight: "70vh", overflowY: "auto" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Palette</h3>
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        {projectItems.filter((p) => p.quantity > 0).map((p) => (
          <PaletteCard key={p.itemId} item={p.item} placed={placedCount(p.itemId)} total={p.quantity} />
        ))}
      </div>
    </aside>
  );
}

function PaletteCard({ item, placed, total }: { item: ItemCatalog; placed: number; total: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${item.id}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, border: "1px solid var(--color-line)", borderRadius: 4, cursor: "grab", background: "white", opacity: isDragging ? 0.5 : 1 }}>
      <span style={{ fontSize: 24 }}>{item.icon}</span>
      <div style={{ flex: 1, fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        <div style={{ color: "var(--color-ink-mute)", fontSize: 11 }}>{placed} of {total} placed</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Placed item + Canvas**

```tsx
// src/components/floorplan/PlacedItem.tsx
"use client";
import { useDraggable } from "@dnd-kit/core";
import type { PlacedItem as P } from "./state";
import type { ItemCatalog } from "@prisma/client";

export function PlacedItemNode({ placed, item, cellPx, selected, onSelect }: { placed: P; item: ItemCatalog; cellPx: number; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `placed:${placed.uid}` });
  const style: React.CSSProperties = {
    position: "absolute",
    left: placed.x * cellPx,
    top: placed.y * cellPx,
    width: item.widthCells * cellPx,
    height: item.heightCells * cellPx,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    background: selected ? "var(--color-terracotta)" : "var(--color-cream-2)",
    color: selected ? "white" : "var(--color-ink)",
    border: "1px solid var(--color-line)",
    borderRadius: 2,
    cursor: "grab",
    fontSize: 11,
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {item.icon} <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
    </div>
  );
}
```

```tsx
// src/components/floorplan/Canvas.tsx
"use client";
import { useEffect } from "react";
import type { FloorState, Action } from "./state";
import type { RoomOutline } from "@/lib/room-presets";
import type { ItemCatalog } from "@prisma/client";
import { PlacedItemNode } from "./PlacedItem";

export function Canvas({
  state, rooms, cellPx, catalog, dispatch,
}: {
  state: FloorState;
  rooms: RoomOutline[];
  cellPx: number;
  catalog: ItemCatalog[];
  dispatch: React.Dispatch<Action>;
}) {
  const itemById = new Map(catalog.map((c) => [c.id, c]));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedUid != null) {
        dispatch({ type: "REMOVE", uid: state.selectedUid });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedUid, dispatch]);

  return (
    <div
      onClick={() => dispatch({ type: "SELECT", uid: null })}
      style={{
        position: "relative",
        width: state.canvas.width * cellPx,
        height: state.canvas.height * cellPx,
        backgroundImage: `repeating-linear-gradient(0deg, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${cellPx}px), repeating-linear-gradient(90deg, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${cellPx}px)`,
        backgroundColor: "var(--color-paper)",
        border: "1px solid var(--color-line)",
      }}
    >
      {rooms.map((r) => (
        <div key={r.id} style={{
          position: "absolute", left: r.x * cellPx, top: r.y * cellPx, width: r.w * cellPx, height: r.h * cellPx,
          border: "1px dashed var(--color-ink-mute)", color: "var(--color-ink-mute)", padding: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {r.label}
        </div>
      ))}
      {state.placed.map((p) => {
        const item = itemById.get(p.itemId);
        if (!item) return null;
        return (
          <PlacedItemNode
            key={p.uid}
            placed={p}
            item={item}
            cellPx={cellPx}
            selected={state.selectedUid === p.uid}
            onSelect={() => dispatch({ type: "SELECT", uid: p.uid })}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Replace the placeholder page**

Replace `src/app/[locale]/projects/[id]/floorplan/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { FloorPlanView } from "@/components/floorplan/FloorPlanView";

export default async function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  return <FloorPlanView project={project} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(floorplan): dnd-kit canvas with palette, rooms, autosave"
```

---

### Task 2.4: PATCH /api/v1/projects/:id for floor_plan_data

**Files:**
- Modify: `src/app/api/v1/projects/[id]/route.ts`

- [ ] **Step 1: Add PATCH handler**

Append to `src/app/api/v1/projects/[id]/route.ts`:

```ts
import { z } from "zod";
import { db } from "@/lib/db";

const patchSchema = z.object({
  floorPlanData: z.unknown().optional(),
  status: z.enum(["draft", "requesting_quotes", "quotes_received", "ordered", "closed"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.project.update({
    where: { id },
    data: {
      floorPlanData: parsed.data.floorPlanData === undefined ? undefined : (parsed.data.floorPlanData as any),
      status: parsed.data.status,
    },
  });
  return NextResponse.json({ ok: true });
}
```

(Make sure `getAuthorizedProject`, `NextResponse`, and `computeSummary` imports remain at the top of the file.)

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): PATCH /projects/:id accepts floorPlanData and status"
```

---

## Phase 3 — Quality + Ops

### Task 3.1: Playwright E2E for buyer happy path

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/buyer-happy-path.spec.ts`, `tests/e2e/global-setup.ts`

- [ ] **Step 1: Playwright config**

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/sv",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
});
```

- [ ] **Step 2: The test**

```ts
// tests/e2e/buyer-happy-path.spec.ts
import { test, expect } from "@playwright/test";

test("buyer can go from landing through floor plan to request page", async ({ page }) => {
  await page.goto("/sv");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /starta ditt kontor/i }).click();

  await expect(page).toHaveURL(/\/sv\/start/);
  await page.getByRole("link", { name: /law firms/i }).click();

  await expect(page).toHaveURL(/\/sv\/projects\/new/);
  await page.getByLabel(/company name/i).fill("Acme Advokatbyrå");
  await page.getByLabel(/headcount/i).fill("12");
  await page.getByLabel(/city/i).selectOption("Stockholm");
  await page.getByRole("button", { name: /fortsätt/i }).click();

  await expect(page).toHaveURL(/\/checklist$/);
  await expect(page.getByText(/total est/i)).toBeVisible();
  await page.getByRole("link", { name: /continue to floor plan/i }).click();

  await expect(page).toHaveURL(/\/floorplan$/);
  await page.getByRole("link", { name: /request 3 quotes/i }).click();

  await expect(page).toHaveURL(/\/request$/);
  await expect(page.getByRole("heading", { name: /begär 3 offerter/i })).toBeVisible();
});
```

- [ ] **Step 3: Run**

```bash
docker compose up -d
pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(e2e): Playwright happy path from landing to request page"
```

---

### Task 3.2: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: officekit, POSTGRES_PASSWORD: officekit, POSTGRES_DB: officekit }
        ports: ["5432:5432"]
        options: --health-cmd="pg_isready -U officekit" --health-interval=5s --health-timeout=5s --health-retries=20
    env:
      DATABASE_URL: postgresql://officekit:officekit@localhost:5432/officekit?schema=public
      AUTH_SECRET: ci-test-secret-not-real
      AUTH_URL: http://localhost:3000
      RESEND_API_KEY: re_ci_dummy
      RESEND_FROM_EMAIL: ci@officekit.test
      NEXT_PUBLIC_APP_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma migrate deploy
      - run: pnpm db:seed
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint + typecheck + vitest + playwright on PR and main"
```

---

### Task 3.3: Sentry setup

**Files:**
- Modify: `next.config.ts`, add `sentry.*.config.ts`

- [ ] **Step 1: Install + wizard**

```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

Follow prompts, point at a new Sentry project, accept default file creation.

- [ ] **Step 2: Verify in dev**

Throw a test error in a route handler temporarily:

```ts
// in any route handler, then remove
throw new Error("sentry-test");
```

Hit the route; verify the event appears in your Sentry dashboard. Revert the test throw.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: integrate Sentry for error monitoring"
```

---

### Task 3.4: README quickstart + .env documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write quickstart**

```markdown
# OfficeKit

Swedish responsive web marketplace for outfitting offices via vetted suppliers.

## Quickstart

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install deps
pnpm install

# 3. Configure env
cp .env.example .env.local
# Generate AUTH_SECRET:
openssl rand -base64 32
# Paste into .env.local AUTH_SECRET. Add a real Resend API key for email.

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Run
pnpm dev
```

Open http://localhost:3000/sv

## Commands

| Command | What |
|--------|------|
| `pnpm dev` | Dev server |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm db:studio` | Prisma Studio GUI |

## Architecture

See `docs/superpowers/specs/2026-05-15-officekit-phase-0-1-2-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README quickstart and command reference"
```

---

## Self-review notes

**Spec coverage check** (mapping spec sections to tasks):

| Spec section | Covered by |
|------|------|
| §1 Scope (in-scope items for Phase 0+1+2) | Tasks 0.x, 1.x, 2.x |
| §2 Architecture | Tasks 0.1–0.4 |
| §3 Project structure | All tasks (file paths) |
| §4 Data layer | Tasks 0.5, 0.8 |
| §5 Auth flow | Tasks 0.9, 1.3, 1.11 (claim.ts) |
| §6 Buyer flow routes | Tasks 1.1, 1.2, 1.7, 1.9, 1.10, 1.11, 1.12 |
| §7 Floor plan | Tasks 2.1, 2.2, 2.3, 2.4 |
| §8 i18n | Task 0.10 |
| §9 Testing | Tasks 0.6, 0.7, 1.3, 2.1, 2.2, 3.1 |
| §10 Deployment + ops | Tasks 0.4, 3.2, 3.3, 3.4 |
| §11 Open questions | Pre-resolved in design; no plan task needed |
| §12 Risks | Mitigations: claim_token (1.3, 1.11), money öre (0.6), rate limit (0.9) |

**Known limitations to call out at execution time**

- The supplier seed (Task 0.8) uses fictional names ("Nordkontor Demo AB" etc.) by design.
- The RFQ fanout (Task 1.11) creates DB rows but does NOT send emails to suppliers — they have no UI yet. Phase 3 of the source spec wires the supplier dashboard.
- Sentry (Task 3.3) is in the source spec's Phase 7 but added here because integration cost is low.
- Stripe/payments are out of scope; the `orders` table exists but no payment intents are created.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-officekit-phase-0-1-2.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
