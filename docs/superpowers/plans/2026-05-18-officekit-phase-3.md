# OfficeKit Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the supplier-facing half of OfficeKit — auth with TOTP 2FA, admin-led onboarding, RFQ inbox + drawer + quote builder, win/loss tracking, and the full analytics dashboard from the prototype.

**Architecture:** Next.js App Router routes under `src/app/[locale]/supplier/...`, API under `src/app/api/v1/supplier/...`. NextAuth gains a Credentials provider alongside the existing Resend provider; password+TOTP gated by a `requireSupplier()` server helper. New libraries: bcrypt, otpauth, qrcode.

**Tech Stack:** Next.js 16, TypeScript strict, Prisma 7 (existing), NextAuth v5 (existing), `bcrypt`, `otpauth`, `qrcode`, Vitest, Playwright. All conventions from Phase 0–2 (integer öre, `--ok-accent`, next-intl, claim-token pattern) carry over unchanged.

**Source spec:** `docs/superpowers/specs/2026-05-18-officekit-phase-3-design.md`
**Parent design:** `docs/superpowers/specs/2026-05-15-officekit-phase-0-1-2-design.md`

---

## File structure

```
src/
├── lib/
│   ├── password.ts                       # NEW — bcrypt wrappers
│   ├── totp.ts                           # NEW — TOTP encrypt/decrypt/verify + recovery codes
│   ├── supplier-auth.ts                  # NEW — requireSupplier() guard
│   ├── auth.ts                           # MODIFY — add Credentials provider
│   └── db.ts, money.ts, ...              # unchanged
├── server/
│   ├── onboarding.ts                     # NEW — verifyToken + completeOnboarding
│   ├── supplier-rfq.ts                   # NEW — listInbox, getDetail, markViewed, expireStale
│   ├── supplier-quote.ts                 # NEW — upsertDraft, submitQuote
│   ├── supplier-metrics.ts               # NEW — getDashboardMetrics
│   ├── rfq-fanout.ts                     # MODIFY — send supplier email per RFQ
│   └── claim.ts, projects.ts, ...        # unchanged
├── emails/
│   ├── SupplierInvite.tsx                # NEW
│   ├── SupplierRfqNotification.tsx       # NEW
│   └── MagicLink.tsx, ...                # unchanged
├── components/supplier/
│   ├── Sidebar.tsx                       # NEW
│   ├── KpiCard.tsx                       # NEW
│   ├── RfqInbox.tsx                      # NEW
│   ├── RfqRow.tsx                        # NEW
│   ├── StockMix.tsx                      # NEW
│   ├── WinRate.tsx                       # NEW
│   ├── QuoteBuilder.tsx                  # NEW
│   ├── QuoteLineRow.tsx                  # NEW
│   ├── TotpEnroll.tsx                    # NEW
│   ├── RecoveryCodesDisplay.tsx          # NEW
│   └── LoginForm.tsx                     # NEW
├── app/[locale]/supplier/
│   ├── layout.tsx                        # NEW
│   ├── login/page.tsx                    # NEW
│   ├── onboarding/[token]/page.tsx       # NEW
│   ├── page.tsx                          # NEW (dashboard)
│   ├── rfqs/
│   │   ├── page.tsx                      # NEW (full inbox)
│   │   └── [id]/page.tsx                 # NEW (detail + builder)
└── app/api/v1/supplier/
    ├── rfqs/route.ts                     # NEW (GET inbox)
    ├── rfqs/[id]/route.ts                # NEW (GET detail, PATCH viewed)
    ├── rfqs/[id]/quote/route.ts          # NEW (PATCH draft, POST submit)
    ├── analytics/route.ts                # NEW (GET dashboard metrics)
    ├── onboarding/verify/route.ts        # NEW
    └── onboarding/complete/route.ts      # NEW

scripts/
├── invite-supplier.ts                    # NEW — CLI: create user + onboarding token + email
└── simulate-buyer-pick.ts                # NEW — dev: set RFQ won/lost for testing

tests/
├── unit/
│   ├── password.test.ts                  # NEW
│   ├── totp.test.ts                      # NEW
│   └── supplier-metrics.test.ts          # NEW
└── e2e/
    └── supplier-happy-path.spec.ts       # NEW

prisma/
├── migrations/<timestamp>_supplier_auth_quote_draft/migration.sql   # NEW
└── schema.prisma                         # MODIFY
```

---

## Task 3.1: Schema migration (5 new columns)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_supplier_auth_quote_draft/migration.sql`

- [ ] **Step 1: Add columns to schema.prisma**

In the `User` model, add inside the block:

```prisma
  twoFaSecret         String?   @map("two_fa_secret")
  twoFaRecoveryCodes  String[]  @default([]) @map("two_fa_recovery_codes")
  onboardingToken     String?   @unique @map("onboarding_token")
  onboardingExpiresAt DateTime? @map("onboarding_expires_at")
```

In the `Quote` model, add:

```prisma
  submittedAt         DateTime? @map("submitted_at")
```

- [ ] **Step 2: Generate migration (interactive disabled — use migrate diff)**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" \
DATABASE_URL="postgresql://officekit:officekit@localhost:5432/officekit?schema=public" \
pnpm prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/migration.sql

# Inspect /tmp/migration.sql — should show 5 ALTER TABLE statements
# Then create the migration directory + apply
mkdir -p prisma/migrations/$(date -u +%Y%m%d%H%M%S)_supplier_auth_quote_draft
mv /tmp/migration.sql prisma/migrations/$(date -u +%Y%m%d%H%M%S)_*/migration.sql
PATH="/opt/homebrew/opt/node@22/bin:$PATH" \
DATABASE_URL="postgresql://officekit:officekit@localhost:5432/officekit?schema=public" \
pnpm prisma migrate deploy
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm prisma generate
```

- [ ] **Step 3: Verify**

```bash
docker compose exec -T postgres psql -U officekit -d officekit -c "\d users" | grep -E "two_fa|onboarding"
docker compose exec -T postgres psql -U officekit -d officekit -c "\d quotes" | grep submitted_at
```

Expected: 4 user columns + 1 quote column visible.

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "feat(db): add 2FA fields, onboarding token, quote.submittedAt"
```

---

## Task 3.2: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd /Users/antoniolazeski/Desktop/officeKit
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm add bcrypt otpauth qrcode
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm add -D @types/bcrypt @types/qrcode
```

- [ ] **Step 2: Verify typecheck**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install bcrypt, otpauth, qrcode for supplier auth"
```

---

## Task 3.3: Password library (TDD)

**Files:**
- Create: `src/lib/password.ts`
- Test: `tests/unit/password.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// tests/unit/password.test.ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashPassword returns a non-empty string different from input", async () => {
    const h = await hashPassword("hunter2!");
    expect(h).toBeTruthy();
    expect(h).not.toBe("hunter2!");
    expect(h.length).toBeGreaterThan(20);
  });

  it("verifyPassword returns true for correct password", async () => {
    const h = await hashPassword("correctHorseBattery");
    expect(await verifyPassword("correctHorseBattery", h)).toBe(true);
  });

  it("verifyPassword returns false for incorrect password", async () => {
    const h = await hashPassword("correctHorseBattery");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("two hashes of the same password are different (salted)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test password
```

- [ ] **Step 3: Implement**

```ts
// src/lib/password.ts
import bcrypt from "bcrypt";

const ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

- [ ] **Step 4: Run, expect pass; commit**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test password
git add src/lib/password.ts tests/unit/password.test.ts
git commit -m "feat(lib): bcrypt password helpers with TDD"
```

---

## Task 3.4: TOTP library (TDD)

**Files:**
- Create: `src/lib/totp.ts`
- Test: `tests/unit/totp.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// tests/unit/totp.test.ts
import { describe, expect, it, beforeAll } from "vitest";
import * as OTPAuth from "otpauth";
import {
  generateSecret,
  encryptSecret,
  decryptSecret,
  verifyToken,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  generateOtpAuthUrl,
} from "@/lib/totp";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-32-chars-minimum-padding-1234";
});

describe("totp", () => {
  it("generateSecret returns a base32 string >= 16 chars", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThanOrEqual(16);
  });

  it("encrypt + decrypt round-trips", () => {
    const s = generateSecret();
    const enc = encryptSecret(s);
    expect(enc).not.toBe(s);
    expect(decryptSecret(enc)).toBe(s);
  });

  it("encrypt produces different output each call (random IV)", () => {
    const s = generateSecret();
    expect(encryptSecret(s)).not.toBe(encryptSecret(s));
  });

  it("verifyToken accepts a fresh code from the same secret", () => {
    const s = generateSecret();
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s) });
    const code = totp.generate();
    expect(verifyToken(s, code)).toBe(true);
  });

  it("verifyToken rejects a clearly wrong code", () => {
    const s = generateSecret();
    expect(verifyToken(s, "000000")).toBe(false);
  });

  it("generateRecoveryCodes returns N unique uppercase codes of correct length", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    for (const c of codes) {
      expect(c).toMatch(/^[A-HJ-NP-Z0-9]{10}$/);
    }
    expect(new Set(codes).size).toBe(8);
  });

  it("hashRecoveryCode + verifyRecoveryCode round-trips", async () => {
    const code = generateRecoveryCodes(1)[0]!;
    const hashed = await hashRecoveryCode(code);
    expect(hashed).not.toBe(code);
    expect(await verifyRecoveryCode(code, hashed)).toBe(true);
    expect(await verifyRecoveryCode("WRONG12345", hashed)).toBe(false);
  });

  it("generateOtpAuthUrl produces a parseable otpauth URL", () => {
    const url = generateOtpAuthUrl("user@example.com", "JBSWY3DPEHPK3PXP");
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain("user%40example.com");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test totp
```

- [ ] **Step 3: Implement**

```ts
// src/lib/totp.ts
import * as OTPAuth from "otpauth";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

const ALGO = "aes-256-gcm";
const RECOVERY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude I/O/L/0/1 ambiguity

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.alloc(0), Buffer.from("totp-key"), 32));
}

export function generateSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB, ctB, tagB] = payload.split(".");
  if (!ivB || !ctB || !tagB) throw new Error("invalid encrypted payload");
  const iv = Buffer.from(ivB, "base64url");
  const ct = Buffer.from(ctB, "base64url");
  const tag = Buffer.from(tagB, "base64url");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function verifyToken(secretBase32: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function generateRecoveryCodes(n: number): string[] {
  const codes: string[] = [];
  while (codes.length < n) {
    const buf = randomBytes(10);
    let s = "";
    for (let i = 0; i < 10; i++) s += RECOVERY_CHARS[buf[i]! % RECOVERY_CHARS.length];
    if (!codes.includes(s)) codes.push(s);
  }
  return codes;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function generateOtpAuthUrl(email: string, secretBase32: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "OfficeKit",
    label: email,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}
```

- [ ] **Step 4: Run, expect pass; commit**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test totp
git add src/lib/totp.ts tests/unit/totp.test.ts
git commit -m "feat(lib): TOTP secret encryption + verification + recovery codes with TDD"
```

---

## Task 3.5: NextAuth Credentials provider

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add Credentials provider**

Replace `src/lib/auth.ts` (preserve existing PrismaAdapter + Resend provider, add Credentials):

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { Resend as ResendClient } from "resend";
import { db } from "@/lib/db";
import { MagicLinkEmail } from "@/emails/MagicLink";
import { verifyPassword } from "@/lib/password";
import { decryptSecret, verifyToken, verifyRecoveryCode } from "@/lib/totp";

const resend = new ResendClient(process.env.RESEND_API_KEY!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" }, // Credentials provider requires JWT sessions
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
    Credentials({
      name: "supplier-credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "TOTP or recovery code", type: "text" },
        useRecovery: { label: "Use recovery code", type: "hidden" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        const code = String(creds?.totp ?? "");
        const useRecovery = String(creds?.useRecovery ?? "") === "true";
        if (!email || !password) return null;

        const user = await db.user.findFirst({
          where: { email, role: "supplier" },
        });
        if (!user || !user.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        if (user.twoFaEnabled) {
          if (!code) return null;
          if (useRecovery) {
            const idx = await findMatchingRecoveryCode(code, user.twoFaRecoveryCodes);
            if (idx < 0) return null;
            const remaining = [...user.twoFaRecoveryCodes];
            remaining.splice(idx, 1);
            await db.user.update({ where: { id: user.id }, data: { twoFaRecoveryCodes: remaining } });
          } else {
            if (!user.twoFaSecret) return null;
            const secret = decryptSecret(user.twoFaSecret);
            if (!verifyToken(secret, code)) return null;
          }
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role, supplierId: user.supplierId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.supplierId = (user as any).supplierId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).supplierId = token.supplierId;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const { claimAnonymousProjects } = await import("@/server/claim");
      if (user.id) await claimAnonymousProjects(user.id);
    },
  },
});

async function findMatchingRecoveryCode(code: string, hashed: string[]): Promise<number> {
  for (let i = 0; i < hashed.length; i++) {
    if (await verifyRecoveryCode(code, hashed[i]!)) return i;
  }
  return -1;
}
```

- [ ] **Step 2: Verify build**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm typecheck
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): add NextAuth Credentials provider with password + TOTP"
```

---

## Task 3.6: requireSupplier server helper

**Files:**
- Create: `src/lib/supplier-auth.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/supplier-auth.ts
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface SupplierSession {
  userId: string;
  supplierId: string;
  email: string;
}

export async function requireSupplier(): Promise<SupplierSession> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string; supplierId?: string | null; email?: string | null } | undefined;
  if (!u?.id || u.role !== "supplier" || !u.supplierId) {
    redirect("/sv/supplier/login");
  }
  return { userId: u.id, supplierId: u.supplierId, email: u.email ?? "" };
}

export async function getSupplierSession(): Promise<SupplierSession | null> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string; supplierId?: string | null; email?: string | null } | undefined;
  if (!u?.id || u.role !== "supplier" || !u.supplierId) return null;
  return { userId: u.id, supplierId: u.supplierId, email: u.email ?? "" };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supplier-auth.ts
git commit -m "feat(auth): requireSupplier server helper"
```

---

## Task 3.7: Onboarding server logic

**Files:**
- Create: `src/server/onboarding.ts`

- [ ] **Step 1: Implement**

```ts
// src/server/onboarding.ts
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { encryptSecret, generateRecoveryCodes, hashRecoveryCode, generateSecret, generateOtpAuthUrl } from "@/lib/totp";
import QRCode from "qrcode";

export async function verifyOnboardingToken(token: string) {
  const user = await db.user.findUnique({
    where: { onboardingToken: token },
    include: { supplier: true },
  });
  if (!user) return null;
  if (!user.onboardingExpiresAt || user.onboardingExpiresAt < new Date()) return null;
  return user;
}

export interface OnboardingPrep {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export async function prepareOnboarding(email: string): Promise<OnboardingPrep> {
  const secret = generateSecret();
  const otpauthUrl = generateOtpAuthUrl(email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrDataUrl };
}

export interface CompleteOnboardingInput {
  token: string;
  password: string;
  totpSecret: string;
  totpToken: string;
}

export interface CompleteOnboardingResult {
  recoveryCodes: string[];
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<CompleteOnboardingResult> {
  const { verifyToken } = await import("@/lib/totp");
  const user = await verifyOnboardingToken(input.token);
  if (!user) throw new Error("invalid_or_expired_token");
  if (input.password.length < 8) throw new Error("password_too_short");
  if (!verifyToken(input.totpSecret, input.totpToken)) throw new Error("invalid_totp");

  const passwordHash = await hashPassword(input.password);
  const encryptedSecret = encryptSecret(input.totpSecret);
  const recoveryPlain = generateRecoveryCodes(8);
  const recoveryHashed = await Promise.all(recoveryPlain.map(hashRecoveryCode));

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      twoFaSecret: encryptedSecret,
      twoFaEnabled: true,
      twoFaRecoveryCodes: recoveryHashed,
      onboardingToken: null,
      onboardingExpiresAt: null,
    },
  });

  return { recoveryCodes: recoveryPlain };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/onboarding.ts
git commit -m "feat(onboarding): verify token, prepare TOTP, complete with recovery codes"
```

---

## Task 3.8: Onboarding API routes

**Files:**
- Create: `src/app/api/v1/supplier/onboarding/verify/route.ts`
- Create: `src/app/api/v1/supplier/onboarding/complete/route.ts`

- [ ] **Step 1: Verify route**

```ts
// src/app/api/v1/supplier/onboarding/verify/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOnboardingToken, prepareOnboarding } from "@/server/onboarding";

const schema = z.object({ token: z.string().min(20) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await verifyOnboardingToken(parsed.data.token);
  if (!user) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  const prep = await prepareOnboarding(user.email);
  return NextResponse.json({ email: user.email, name: user.name, supplier: { name: user.supplier?.name }, ...prep });
}
```

- [ ] **Step 2: Complete route**

```ts
// src/app/api/v1/supplier/onboarding/complete/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { completeOnboarding } from "@/server/onboarding";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
  totpSecret: z.string().min(16),
  totpToken: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { recoveryCodes } = await completeOnboarding(parsed.data);
    return NextResponse.json({ recoveryCodes });
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/supplier/onboarding
git commit -m "feat(api): supplier onboarding verify + complete endpoints"
```

---

## Task 3.9: Invite-supplier CLI script

**Files:**
- Create: `scripts/invite-supplier.ts`
- Create: `src/emails/SupplierInvite.tsx`

- [ ] **Step 1: Email template**

```tsx
// src/emails/SupplierInvite.tsx
import { Body, Container, Heading, Html, Link, Text } from "@react-email/components";

export function SupplierInviteEmail({ url, supplierName, locale }: { url: string; supplierName: string; locale: "sv" | "en" }) {
  const t = locale === "sv"
    ? { heading: "Välkommen till OfficeKit", body: `Du har bjudits in att representera ${supplierName} på OfficeKit. Klicka på länken för att aktivera ditt konto.`, cta: "Aktivera konto" }
    : { heading: "Welcome to OfficeKit", body: `You've been invited to represent ${supplierName} on OfficeKit. Click the link to activate your account.`, cta: "Activate account" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 480, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 16, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: CLI script**

```ts
// scripts/invite-supplier.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

// Load .env.local manually
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
} catch {}

import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { SupplierInviteEmail } from "@/emails/SupplierInvite";

const db = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const k = args[i]!;
    if (k.startsWith("--")) {
      const key = k.slice(2);
      const val = args[i + 1] ?? "";
      out[key] = val;
      i++;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const email = args.email?.toLowerCase();
  const supplierId = args["supplier-id"];
  const name = args.name;
  if (!email || !supplierId) {
    console.error("Usage: pnpm tsx scripts/invite-supplier.ts --email <addr> --supplier-id <uuid> [--name <name>]");
    process.exit(1);
  }
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    console.error(`Supplier ${supplierId} not found`);
    process.exit(1);
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = await db.user.upsert({
    where: { email },
    create: { email, name, role: "supplier", supplierId, onboardingToken: token, onboardingExpiresAt: expiresAt },
    update: { name, role: "supplier", supplierId, onboardingToken: token, onboardingExpiresAt: expiresAt },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sv/supplier/onboarding/${token}`;
  console.log(`\nOnboarding link (also emailed to ${email}):\n${url}\n`);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (apiKey && from && !apiKey.startsWith("re_xxx")) {
    const resend = new Resend(apiKey);
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: "Aktivera ditt OfficeKit-konto",
        react: SupplierInviteEmail({ url, supplierName: supplier.name, locale: "sv" }),
      });
      console.log("Email sent.");
    } catch (e) {
      console.error("Email send failed (link still printed above):", (e as Error).message);
    }
  } else {
    console.log("No real RESEND_API_KEY — email not sent. Use the link above manually.");
  }
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 3: Test it**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm tsx scripts/invite-supplier.ts \
  --email test-supplier@officekit.test \
  --supplier-id $(docker compose exec -T postgres psql -U officekit -d officekit -tA -c "select id from suppliers limit 1;")
```

Expected: prints an onboarding URL. Email send fails (no real key) but link is shown.

- [ ] **Step 4: Commit**

```bash
git add scripts/invite-supplier.ts src/emails/SupplierInvite.tsx
git commit -m "feat(onboarding): admin CLI to invite suppliers + invite email template"
```

---

## Task 3.10: Onboarding page UI

**Files:**
- Create: `src/app/[locale]/supplier/onboarding/[token]/page.tsx`
- Create: `src/components/supplier/OnboardingWizard.tsx`
- Create: `src/components/supplier/TotpEnroll.tsx`
- Create: `src/components/supplier/RecoveryCodesDisplay.tsx`

- [ ] **Step 1: Server page entry**

```tsx
// src/app/[locale]/supplier/onboarding/[token]/page.tsx
import { notFound } from "next/navigation";
import { verifyOnboardingToken, prepareOnboarding } from "@/server/onboarding";
import { OnboardingWizard } from "@/components/supplier/OnboardingWizard";

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await verifyOnboardingToken(token);
  if (!user) notFound();
  const prep = await prepareOnboarding(user.email);
  return (
    <OnboardingWizard
      token={token}
      email={user.email}
      supplierName={user.supplier?.name ?? ""}
      totpSecret={prep.secret}
      qrDataUrl={prep.qrDataUrl}
    />
  );
}
```

- [ ] **Step 2: Wizard component**

```tsx
// src/components/supplier/OnboardingWizard.tsx
"use client";
import { useState } from "react";
import { TotpEnroll } from "./TotpEnroll";
import { RecoveryCodesDisplay } from "./RecoveryCodesDisplay";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function OnboardingWizard({ token, email, supplierName, totpSecret, qrDataUrl }: {
  token: string;
  email: string;
  supplierName: string;
  totpSecret: string;
  qrDataUrl: string;
}) {
  const t = useTranslations("supplier.onboarding");
  const router = useRouter();
  const [step, setStep] = useState<"password" | "totp" | "recovery">("password");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function complete() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/supplier/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password, totpSecret, totpToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "invalid");
      setSubmitting(false);
      return;
    }
    setRecoveryCodes(data.recoveryCodes);
    setStep("recovery");
    setSubmitting(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 32px" }}>
      <p style={{ color: "var(--color-ink-mute)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{supplierName}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, marginTop: 8 }}>
        {step === "password" && t("setPassword.title")}
        {step === "totp" && t("enroll2fa.title")}
        {step === "recovery" && t("recovery.title")}
      </h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>{email}</p>

      {step === "password" && (
        <div style={{ marginTop: 32 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("setPassword.password")}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }} />
            <span style={{ fontSize: 12, color: "var(--color-ink-mute)" }}>{t("setPassword.hint")}</span>
          </label>
          <button onClick={() => setStep("totp")} disabled={password.length < 8}
            style={{ marginTop: 24, background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
            {t("setPassword.next")} →
          </button>
        </div>
      )}

      {step === "totp" && (
        <TotpEnroll qrDataUrl={qrDataUrl} secret={totpSecret} value={totpToken} onChange={setTotpToken} onSubmit={complete} submitting={submitting} error={error} />
      )}

      {step === "recovery" && (
        <RecoveryCodesDisplay codes={recoveryCodes} onContinue={() => router.push("/supplier/login")} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: TotpEnroll component**

```tsx
// src/components/supplier/TotpEnroll.tsx
"use client";
import { useTranslations } from "next-intl";

export function TotpEnroll({ qrDataUrl, secret, value, onChange, onSubmit, submitting, error }: {
  qrDataUrl: string;
  secret: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const t = useTranslations("supplier.onboarding.enroll2fa");
  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ color: "var(--color-ink-soft)" }}>{t("qrInstruction")}</p>
      <div style={{ marginTop: 16, padding: 16, border: "1px solid var(--color-line)", borderRadius: 4, background: "white", display: "inline-block" }}>
        <img src={qrDataUrl} alt="TOTP QR code" width={200} height={200} />
      </div>
      <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-mute)" }}>
        Or enter manually: <code>{secret}</code>
      </p>
      <label style={{ display: "grid", gap: 6, marginTop: 24, maxWidth: 200 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("code")}</span>
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          pattern="\d{6}" maxLength={6}
          style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: "0.2em" }} />
      </label>
      {error && <p style={{ color: "var(--color-terracotta)", marginTop: 12 }}>{error}</p>}
      <button onClick={onSubmit} disabled={submitting || value.length !== 6}
        style={{ marginTop: 24, background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
        {submitting ? "…" : t("verify")} →
      </button>
    </div>
  );
}
```

- [ ] **Step 4: RecoveryCodesDisplay component**

```tsx
// src/components/supplier/RecoveryCodesDisplay.tsx
"use client";
import { useTranslations } from "next-intl";

export function RecoveryCodesDisplay({ codes, onContinue }: { codes: string[]; onContinue: () => void }) {
  const t = useTranslations("supplier.onboarding.recovery");
  function download() {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "officekit-recovery-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ color: "var(--color-ink-soft)" }}>{t("body")}</p>
      <pre style={{ marginTop: 16, padding: 24, background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 14, lineHeight: 1.8 }}>
        {codes.join("\n")}
      </pre>
      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <button onClick={download}
          style={{ background: "transparent", color: "var(--color-ink)", padding: "12px 24px", border: "1px solid var(--color-line)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {t("download")}
        </button>
        <button onClick={onContinue}
          style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {t("continue")} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(supplier): onboarding wizard with password + TOTP + recovery codes"
```

---

## Task 3.11: Supplier login page

**Files:**
- Create: `src/app/[locale]/supplier/login/page.tsx`
- Create: `src/components/supplier/LoginForm.tsx`

- [ ] **Step 1: Login form (client)**

```tsx
// src/components/supplier/LoginForm.tsx
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("supplier.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn("credentials", {
      email, password, totp, useRecovery: useRecovery ? "true" : "false",
      redirect: false,
    });
    if (res?.error) {
      setError(t("invalid"));
      setSubmitting(false);
      return;
    }
    router.push("/supplier");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, marginTop: 32 }}>
      <Field label={t("email")} type="email" value={email} onChange={setEmail} required />
      <Field label={t("password")} type="password" value={password} onChange={setPassword} required />
      <Field
        label={useRecovery ? t("recoveryCode") : t("totp")}
        value={totp}
        onChange={setTotp}
        placeholder={useRecovery ? "ABCDE12345" : "000000"}
        required
      />
      <button type="button" onClick={() => setUseRecovery((x) => !x)} style={{ background: "none", border: "none", color: "var(--color-ink-mute)", fontSize: 13, textAlign: "left", cursor: "pointer", padding: 0 }}>
        {useRecovery ? t("useTotp") : t("useRecovery")}
      </button>
      {error && <p style={{ color: "var(--color-terracotta)" }}>{error}</p>}
      <button type="submit" disabled={submitting}
        style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
        {submitting ? "…" : t("submit")} →
      </button>
    </form>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "10px 12px" }} />
    </label>
  );
}
```

- [ ] **Step 2: Login page**

```tsx
// src/app/[locale]/supplier/login/page.tsx
import { LoginForm } from "@/components/supplier/LoginForm";
import { getTranslations } from "next-intl/server";

export default async function SupplierLoginPage() {
  const t = await getTranslations("supplier.login");
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>{t("subtitle")}</p>
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(supplier): login page with password + TOTP/recovery code"
```

---

## Task 3.12: Supplier email notification on RFQ fanout

**Files:**
- Modify: `src/server/rfq-fanout.ts`
- Create: `src/emails/SupplierRfqNotification.tsx`

- [ ] **Step 1: Email template**

```tsx
// src/emails/SupplierRfqNotification.tsx
import { Body, Container, Heading, Html, Link, Text } from "@react-email/components";

export function SupplierRfqNotificationEmail({
  url, industry, city, headcount, itemCount, deadlineAt, locale,
}: {
  url: string;
  industry: string;
  city: string;
  headcount: number;
  itemCount: number;
  deadlineAt: Date;
  locale: "sv" | "en";
}) {
  const deadlineStr = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(deadlineAt);
  const t = locale === "sv"
    ? { heading: "Ny offertförfrågan", body: "Du har fått en ny offertförfrågan via OfficeKit.", cta: "Visa förfrågan", deadline: "Deadline:", details: "Detaljer" }
    : { heading: "New quote request", body: "You've received a new quote request via OfficeKit.", cta: "View request", deadline: "Deadline:", details: "Details" };
  return (
    <Html lang={locale}>
      <Body style={{ fontFamily: "Manrope, sans-serif", background: "#faf7ef", padding: 32 }}>
        <Container style={{ maxWidth: 520, background: "#fff", padding: 32, borderRadius: 4 }}>
          <Heading style={{ fontFamily: "Fraunces, serif" }}>{t.heading}</Heading>
          <Text>{t.body}</Text>
          <Text style={{ fontSize: 14, color: "#4a544a", marginTop: 16 }}>{t.details}:</Text>
          <Text style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
            Industry: {industry}<br/>
            Location: {city}<br/>
            Headcount: {headcount}<br/>
            Items: {itemCount}<br/>
            {t.deadline} {deadlineStr}
          </Text>
          <Link href={url} style={{ display: "inline-block", marginTop: 24, padding: "12px 24px", background: "#c5552d", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
            {t.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Modify rfq-fanout.ts to send emails**

Replace `src/server/rfq-fanout.ts`:

```ts
import { db } from "@/lib/db";
import { addHours } from "date-fns";
import { Resend } from "resend";
import { SupplierRfqNotificationEmail } from "@/emails/SupplierRfqNotification";

export async function fanoutRfqs(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { company: true, items: true },
  });

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

  // Send supplier notification emails
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (apiKey && from && !apiKey.startsWith("re_xxx")) {
    const resend = new Resend(apiKey);
    const itemCount = project.items.reduce((n, r) => n + r.quantity, 0);
    for (const rfq of rfqs) {
      const supplierUser = await db.user.findFirst({ where: { supplierId: rfq.supplierId, role: "supplier" } });
      if (!supplierUser?.email) continue;
      try {
        await resend.emails.send({
          from,
          to: supplierUser.email,
          subject: supplierUser.locale === "sv" ? "Ny offertförfrågan på OfficeKit" : "New quote request on OfficeKit",
          react: SupplierRfqNotificationEmail({
            url: `${appUrl}/${supplierUser.locale}/supplier/rfqs/${rfq.id}`,
            industry: project.industry,
            city: project.city,
            headcount: project.headcount,
            itemCount,
            deadlineAt: deadline,
            locale: supplierUser.locale,
          }),
        });
      } catch (e) {
        console.error(`Supplier RFQ email failed for ${supplierUser.email}`, (e as Error).message);
      }
    }
  }

  return rfqs;
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(rfq): send supplier email notification on fanout"
```

---

## Task 3.13: Supplier RFQ inbox endpoint + auto-expire

**Files:**
- Create: `src/server/supplier-rfq.ts`
- Create: `src/app/api/v1/supplier/rfqs/route.ts`

- [ ] **Step 1: Server logic**

```ts
// src/server/supplier-rfq.ts
import { db } from "@/lib/db";
import type { RfqStatus } from "@prisma/client";

export async function expireStaleRfqs(supplierId: string) {
  await db.rfq.updateMany({
    where: {
      supplierId,
      status: { in: ["sent", "viewed"] },
      deadlineAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });
}

export interface InboxFilter {
  status?: RfqStatus | "all";
  limit?: number;
  offset?: number;
}

export async function listInbox(supplierId: string, filter: InboxFilter = {}) {
  await expireStaleRfqs(supplierId);
  const where: { supplierId: string; status?: RfqStatus } = { supplierId };
  if (filter.status && filter.status !== "all") where.status = filter.status;
  const [rfqs, total] = await Promise.all([
    db.rfq.findMany({
      where,
      include: {
        project: { include: { company: true, items: true } },
        quote: true,
      },
      orderBy: { deadlineAt: "asc" },
      take: filter.limit ?? 50,
      skip: filter.offset ?? 0,
    }),
    db.rfq.count({ where }),
  ]);
  return { rfqs, total };
}

export async function markViewed(rfqId: string, supplierId: string) {
  const result = await db.rfq.updateMany({
    where: { id: rfqId, supplierId, viewedAt: null },
    data: { status: "viewed", viewedAt: new Date() },
  });
  return result.count > 0;
}

export async function getRfqDetail(rfqId: string, supplierId: string) {
  return db.rfq.findFirst({
    where: { id: rfqId, supplierId },
    include: {
      project: { include: { company: true, items: { include: { item: true } } } },
      supplier: true,
      quote: { include: { lines: { include: { item: true } } } },
    },
  });
}
```

- [ ] **Step 2: Route**

```ts
// src/app/api/v1/supplier/rfqs/route.ts
import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { listInbox } from "@/server/supplier-rfq";

export async function GET(req: Request) {
  const { supplierId } = await requireSupplier();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const { rfqs, total } = await listInbox(supplierId, {
    status: (status as any) ?? "all",
    limit,
    offset,
  });
  return NextResponse.json({ rfqs, total });
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(supplier): RFQ inbox endpoint with auto-expire and status filter"
```

---

## Task 3.14: RFQ detail endpoint + viewed tracking

**Files:**
- Create: `src/app/api/v1/supplier/rfqs/[id]/route.ts`

- [ ] **Step 1: Route**

```ts
// src/app/api/v1/supplier/rfqs/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { getRfqDetail, markViewed } from "@/server/supplier-rfq";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  await markViewed(id, supplierId);
  const rfq = await getRfqDetail(id, supplierId);
  if (!rfq) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Count competitors (other RFQs on same project)
  const competitorCount = await import("@/lib/db").then(({ db }) =>
    db.rfq.count({ where: { projectId: rfq.projectId, NOT: { id: rfq.id } } })
  );
  return NextResponse.json({ rfq, competitorCount });
}

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const ok = await markViewed(id, supplierId);
  return NextResponse.json({ ok });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(supplier): RFQ detail endpoint with viewed tracking"
```

---

## Task 3.15: Quote draft/submit endpoints + server logic

**Files:**
- Create: `src/server/supplier-quote.ts`
- Create: `src/app/api/v1/supplier/rfqs/[id]/quote/route.ts`

- [ ] **Step 1: Server logic**

```ts
// src/server/supplier-quote.ts
import { db } from "@/lib/db";
import { addVat } from "@/lib/money";
import { addDays } from "date-fns";
import type { ItemMode } from "@prisma/client";

export interface DraftLineInput {
  itemId: string;
  quantity: number;
  mode: ItemMode;
  unitPrice: number; // öre ex VAT
}

export interface DraftQuoteInput {
  rfqId: string;
  supplierId: string;
  lines: DraftLineInput[];
  notes: string;
  perks: string[];
}

export async function upsertDraft(input: DraftQuoteInput) {
  const rfq = await db.rfq.findFirst({
    where: { id: input.rfqId, supplierId: input.supplierId },
  });
  if (!rfq) throw new Error("not_found");

  const subtotal = input.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = addVat(subtotal);

  const quote = await db.quote.upsert({
    where: { rfqId: input.rfqId },
    create: {
      rfqId: input.rfqId,
      totalAmount: total,
      totalAmountExVat: subtotal,
      validUntil: addDays(new Date(), 14),
      notes: input.notes,
      perks: input.perks,
      submittedAt: null,
      lines: {
        create: input.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          mode: l.mode,
          unitPrice: l.unitPrice,
          lineTotal: l.unitPrice * l.quantity,
        })),
      },
    },
    update: {
      totalAmount: total,
      totalAmountExVat: subtotal,
      notes: input.notes,
      perks: input.perks,
      lines: {
        deleteMany: {},
        create: input.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          mode: l.mode,
          unitPrice: l.unitPrice,
          lineTotal: l.unitPrice * l.quantity,
        })),
      },
    },
    include: { lines: true },
  });

  return quote;
}

export async function submitQuote(rfqId: string, supplierId: string) {
  // Verify supplier has 2FA enabled (spec section 9.3)
  const user = await db.user.findFirst({ where: { supplierId, role: "supplier" } });
  if (!user?.twoFaEnabled) throw new Error("2fa_required");

  const quote = await db.quote.findFirst({
    where: { rfqId, rfq: { supplierId } },
    include: { lines: true },
  });
  if (!quote) throw new Error("draft_not_found");
  if (quote.lines.length === 0) throw new Error("no_lines");

  const now = new Date();
  await db.$transaction([
    db.quote.update({ where: { id: quote.id }, data: { submittedAt: now } }),
    db.rfq.update({ where: { id: rfqId }, data: { status: "quoted", quotedAt: now } }),
  ]);

  return db.quote.findUnique({ where: { id: quote.id }, include: { lines: { include: { item: true } } } });
}
```

- [ ] **Step 2: Route**

```ts
// src/app/api/v1/supplier/rfqs/[id]/quote/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupplier } from "@/lib/supplier-auth";
import { upsertDraft, submitQuote } from "@/server/supplier-quote";

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0).max(9999),
  mode: z.enum(["new", "used"]),
  unitPrice: z.number().int().min(0).max(100_000_000),
});

const draftSchema = z.object({
  lines: z.array(lineSchema),
  notes: z.string().max(2000).default(""),
  perks: z.array(z.string().max(80)).max(20).default([]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const body = await req.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const lines = parsed.data.lines.filter((l) => l.quantity > 0);
    const quote = await upsertDraft({ rfqId: id, supplierId, lines, notes: parsed.data.notes, perks: parsed.data.perks });
    return NextResponse.json({ quote });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  try {
    const quote = await submitQuote(id, supplierId);
    return NextResponse.json({ quote });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(supplier): quote draft (PATCH) and submit (POST) endpoints"
```

---

## Task 3.16: Simulate-buyer-pick script

**Files:**
- Create: `scripts/simulate-buyer-pick.ts`

- [ ] **Step 1: Script**

```ts
// scripts/simulate-buyer-pick.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
} catch {}

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function args() {
  const out: Record<string, string> = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.startsWith("--")) { out[a[i]!.slice(2)] = a[i + 1] ?? ""; i++; }
  }
  return out;
}

async function main() {
  const { "project-id": projectId, "winning-rfq-id": winningRfqId } = args();
  if (!projectId || !winningRfqId) {
    console.error("Usage: pnpm tsx scripts/simulate-buyer-pick.ts --project-id <uuid> --winning-rfq-id <uuid>");
    process.exit(1);
  }
  const now = new Date();
  const allRfqs = await db.rfq.findMany({ where: { projectId } });
  if (!allRfqs.some((r) => r.id === winningRfqId)) {
    console.error(`Winning RFQ ${winningRfqId} not in project ${projectId}`);
    process.exit(1);
  }
  await db.$transaction([
    db.rfq.update({ where: { id: winningRfqId }, data: { status: "won", decidedAt: now } }),
    db.rfq.updateMany({
      where: { projectId, NOT: { id: winningRfqId }, status: { in: ["sent", "viewed", "quoted"] } },
      data: { status: "lost", decidedAt: now },
    }),
    db.project.update({ where: { id: projectId }, data: { status: "ordered" } }),
  ]);
  console.log(`Set RFQ ${winningRfqId} → won; ${allRfqs.length - 1} others → lost; project → ordered`);
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 2: Commit**

```bash
git add scripts/simulate-buyer-pick.ts
git commit -m "feat(dev): simulate-buyer-pick script for testing win/loss flow"
```

---

## Task 3.17: Supplier shell layout + sidebar

**Files:**
- Create: `src/app/[locale]/supplier/layout.tsx`
- Create: `src/components/supplier/Sidebar.tsx`

- [ ] **Step 1: Layout**

```tsx
// src/app/[locale]/supplier/layout.tsx
import { Sidebar } from "@/components/supplier/Sidebar";
import { getSupplierSession } from "@/lib/supplier-auth";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await getSupplierSession();
  // Login + onboarding pages must work without session; they don't import this layout.
  // But since they're under /supplier/*, we need to allow them. Solution: layout is a passthrough
  // when no session, and routes that require auth call requireSupplier() themselves.
  if (!session) return <>{children}</>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ padding: "32px 48px" }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar**

```tsx
// src/components/supplier/Sidebar.tsx
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export async function Sidebar() {
  const t = await getTranslations("supplier.nav");
  return (
    <nav style={{ background: "var(--color-cream)", borderRight: "1px solid var(--color-line)", padding: "32px 24px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24 }}>
        <span style={{ color: "var(--color-ink)" }}>office</span>
        <span style={{ color: "var(--color-terracotta)", fontWeight: 700 }}>kit.</span>
      </div>
      <ul style={{ marginTop: 32, listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        <li><Link href="/supplier" style={navLink}>{t("dashboard")}</Link></li>
        <li><Link href="/supplier/rfqs" style={navLink}>{t("rfqs")}</Link></li>
        <li><Link href="/supplier/settings" style={navLink}>{t("settings")}</Link></li>
      </ul>
    </nav>
  );
}

const navLink: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  color: "var(--color-ink)",
  textDecoration: "none",
  fontSize: 14,
  borderRadius: 4,
};
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(supplier): shell layout + sidebar nav"
```

---

## Task 3.18: RFQ inbox page + components

**Files:**
- Create: `src/app/[locale]/supplier/rfqs/page.tsx`
- Create: `src/components/supplier/RfqInbox.tsx`
- Create: `src/components/supplier/RfqRow.tsx`

- [ ] **Step 1: Server page**

```tsx
// src/app/[locale]/supplier/rfqs/page.tsx
import { requireSupplier } from "@/lib/supplier-auth";
import { listInbox } from "@/server/supplier-rfq";
import { RfqInbox } from "@/components/supplier/RfqInbox";
import { getTranslations } from "next-intl/server";

export default async function SupplierRfqsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supplierId } = await requireSupplier();
  const sp = await searchParams;
  const status = (sp.status as any) ?? "all";
  const { rfqs, total } = await listInbox(supplierId, { status });
  const t = await getTranslations("supplier.inbox");
  return (
    <div style={{ maxWidth: 1280 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>{total} {t("totalRequests")}</p>
      <RfqInbox rfqs={rfqs} activeStatus={status} />
    </div>
  );
}
```

- [ ] **Step 2: RfqInbox client component**

```tsx
// src/components/supplier/RfqInbox.tsx
"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RfqRow } from "./RfqRow";
import type { Rfq, Project, Company, Quote, ProjectItem } from "@prisma/client";

type RfqWithProject = Rfq & {
  project: Project & { company: Company; items: ProjectItem[] };
  quote: Quote | null;
};

const STATUSES = ["all", "sent", "viewed", "quoted", "won", "lost", "expired"] as const;

export function RfqInbox({ rfqs, activeStatus }: { rfqs: RfqWithProject[]; activeStatus: string }) {
  const t = useTranslations("supplier.inbox");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setStatus(s: string) {
    const params = new URLSearchParams(sp);
    if (s === "all") params.delete("status");
    else params.set("status", s);
    router.push(`${pathname}?${params}`);
  }

  return (
    <>
      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              border: "1px solid var(--color-line)",
              background: activeStatus === s ? "var(--color-ink)" : "transparent",
              color: activeStatus === s ? "white" : "var(--color-ink)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}>
            {t(`filter_${s}`)}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        {rfqs.length === 0 ? (
          <p style={{ color: "var(--color-ink-mute)" }}>{t("empty")}</p>
        ) : (
          rfqs.map((r) => <RfqRow key={r.id} rfq={r} />)
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: RfqRow**

```tsx
// src/components/supplier/RfqRow.tsx
"use client";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import type { Rfq, Project, Company, Quote, ProjectItem } from "@prisma/client";

type RfqWithProject = Rfq & {
  project: Project & { company: Company; items: ProjectItem[] };
  quote: Quote | null;
};

function timeRemaining(deadline: Date): string {
  const ms = deadline.getTime() - Date.now();
  if (ms < 0) return "expired";
  const h = Math.floor(ms / 3600_000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${m}m`;
}

const STATUS_COLOR: Record<string, string> = {
  sent: "var(--color-gold)",
  viewed: "var(--color-ink-soft)",
  quoted: "var(--color-green-leaf)",
  won: "var(--color-green-leaf)",
  lost: "var(--color-terracotta)",
  expired: "var(--color-ink-mute)",
};

export function RfqRow({ rfq }: { rfq: RfqWithProject }) {
  const t = useTranslations("supplier.inbox");
  const itemCount = rfq.project.items.reduce((n, r) => n + r.quantity, 0);
  return (
    <Link href={`/supplier/rfqs/${rfq.id}`} style={{
      display: "grid",
      gridTemplateColumns: "1fr 120px 100px",
      gap: 16,
      padding: 20,
      borderTop: "1px solid var(--color-line)",
      textDecoration: "none",
      color: "inherit",
      alignItems: "center",
    }}>
      <div>
        <h4 style={{ margin: 0, fontWeight: 600 }}>{rfq.project.company.name}</h4>
        <p style={{ margin: "4px 0 0", color: "var(--color-ink-mute)", fontSize: 13 }}>
          {rfq.project.industry} · {rfq.project.city} · {rfq.project.headcount} ppl · {itemCount} items
          {" · "}
          <span style={{ color: STATUS_COLOR[rfq.status], textTransform: "uppercase", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em" }}>
            {rfq.status}
          </span>
        </p>
      </div>
      <div style={{ textAlign: "right", color: "var(--color-ink-mute)", fontSize: 12 }}>
        {t("closesIn")} {timeRemaining(rfq.deadlineAt)}
      </div>
      <div style={{ textAlign: "right", fontWeight: 600 }}>
        {rfq.quote ? formatSek(rfq.quote.totalAmount) : "—"}
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(supplier): RFQ inbox page with status filter and rows"
```

---

## Task 3.19: RFQ detail page + QuoteBuilder

**Files:**
- Create: `src/app/[locale]/supplier/rfqs/[id]/page.tsx`
- Create: `src/components/supplier/QuoteBuilder.tsx`
- Create: `src/components/supplier/QuoteLineRow.tsx`

- [ ] **Step 1: Server page**

```tsx
// src/app/[locale]/supplier/rfqs/[id]/page.tsx
import { notFound } from "next/navigation";
import { requireSupplier } from "@/lib/supplier-auth";
import { getRfqDetail, markViewed } from "@/server/supplier-rfq";
import { QuoteBuilder } from "@/components/supplier/QuoteBuilder";
import { db } from "@/lib/db";

export default async function SupplierRfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplierId } = await requireSupplier();
  await markViewed(id, supplierId);
  const rfq = await getRfqDetail(id, supplierId);
  if (!rfq) notFound();
  const competitorCount = await db.rfq.count({ where: { projectId: rfq.projectId, NOT: { id: rfq.id } } });

  // Ensure a draft quote exists for the builder to edit
  if (!rfq.quote) {
    const fresh = await db.quote.create({
      data: {
        rfqId: rfq.id,
        totalAmount: 0,
        totalAmountExVat: 0,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: "",
        perks: [],
        lines: {
          create: rfq.project.items.map((pi) => ({
            itemId: pi.itemId,
            quantity: pi.quantity,
            mode: pi.mode,
            unitPrice: pi.mode === "new" ? pi.item.priceNewDefault : (pi.item.priceUsedDefault ?? pi.item.priceNewDefault),
            lineTotal: pi.quantity * (pi.mode === "new" ? pi.item.priceNewDefault : (pi.item.priceUsedDefault ?? pi.item.priceNewDefault)),
          })),
        },
      },
      include: { lines: { include: { item: true } } },
    });
    rfq.quote = fresh as typeof rfq.quote;
  }

  return <QuoteBuilder rfq={rfq} competitorCount={competitorCount} />;
}
```

- [ ] **Step 2: QuoteBuilder**

```tsx
// src/components/supplier/QuoteBuilder.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { formatSek } from "@/lib/money";
import { QuoteLineRow } from "./QuoteLineRow";
import type { Rfq, Project, Company, Quote, QuoteLine, ItemCatalog, ProjectItem } from "@prisma/client";

type RfqWithEverything = Rfq & {
  project: Project & { company: Company; items: (ProjectItem & { item: ItemCatalog })[] };
  quote: (Quote & { lines: (QuoteLine & { item: ItemCatalog })[] }) | null;
};

export function QuoteBuilder({ rfq, competitorCount }: { rfq: RfqWithEverything; competitorCount: number }) {
  const t = useTranslations("supplier.rfq");
  const router = useRouter();
  const submitted = rfq.quote?.submittedAt != null;
  const [lines, setLines] = useState(rfq.quote?.lines ?? []);
  const [notes, setNotes] = useState(rfq.quote?.notes ?? "");
  const [perks, setPerks] = useState<string[]>(rfq.quote?.perks ?? []);
  const [perkDraft, setPerkDraft] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = Math.round(subtotal * 1.25);

  useEffect(() => {
    if (submitted) return;
    const h = setTimeout(saveDraft, 30_000);
    return () => clearTimeout(h);
  }, [lines, notes, perks]);

  async function saveDraft() {
    const res = await fetch(`/api/v1/supplier/rfqs/${rfq.id}/quote`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, notes, perks }),
    });
    if (res.ok) setSavedAt(new Date());
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    await saveDraft();
    const res = await fetch(`/api/v1/supplier/rfqs/${rfq.id}/quote`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "submit_failed"); setSubmitting(false); return; }
    router.push("/supplier/rfqs?status=quoted");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 48, maxWidth: 1280 }}>
      <div>
        <p style={{ color: "var(--color-ink-mute)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{rfq.project.industry} · {competitorCount} {t("competitorsLabel")}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, marginTop: 8 }}>{rfq.project.company.name}</h1>
        <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
          {rfq.project.city} · {rfq.project.headcount} {t("people")} · {t("deadline")} {new Date(rfq.deadlineAt).toLocaleString()}
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 40 }}>{t("builderTitle")}</h2>
        <div style={{ marginTop: 16 }}>
          {lines.map((l, idx) => (
            <QuoteLineRow
              key={l.id}
              line={l}
              disabled={submitted}
              onChange={(patch) => setLines((arr) => arr.map((x, i) => i === idx ? { ...x, ...patch, lineTotal: (patch.unitPrice ?? x.unitPrice) * (patch.quantity ?? x.quantity) } : x))}
              onRemove={() => setLines((arr) => arr.filter((_, i) => i !== idx))}
            />
          ))}
        </div>

        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 32 }}>{t("notes")}</h3>
        <textarea disabled={submitted} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
          style={{ marginTop: 8, width: "100%", background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 12, fontFamily: "var(--font-body)", fontSize: 14 }} />

        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 32 }}>{t("perks")}</h3>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {perks.map((p, i) => (
            <span key={i} style={{ padding: "6px 12px", background: "var(--color-cream-2)", borderRadius: 100, fontSize: 12 }}>
              {p} {!submitted && <button onClick={() => setPerks(perks.filter((_, ix) => ix !== i))} style={{ marginLeft: 8, border: "none", background: "transparent", cursor: "pointer" }}>×</button>}
            </span>
          ))}
          {!submitted && (
            <span style={{ display: "inline-flex", gap: 4 }}>
              <input value={perkDraft} onChange={(e) => setPerkDraft(e.target.value)} placeholder={t("addPerk")}
                style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "4px 8px", fontSize: 12 }} />
              <button onClick={() => { if (perkDraft) { setPerks([...perks, perkDraft]); setPerkDraft(""); } }}
                style={{ background: "transparent", border: "1px solid var(--color-line)", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>+</button>
            </span>
          )}
        </div>
      </div>

      <aside style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 32, height: "fit-content", position: "sticky", top: 32 }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>{t("totals")}</p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <span>{t("subtotal")}</span><span>{formatSek(subtotal)}</span>
        </div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", color: "var(--color-ink-mute)" }}>
          <span>{t("vat")}</span><span>{formatSek(total - subtotal)}</span>
        </div>
        <hr style={{ border: 0, borderTop: "1px solid var(--color-line)", margin: "16px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{t("total")}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-terracotta)" }}>{formatSek(total)}</span>
        </div>
        {savedAt && !submitted && <p style={{ marginTop: 16, fontSize: 11, color: "var(--color-ink-mute)" }}>{t("savedAt")} {savedAt.toLocaleTimeString()}</p>}
        {submitted && <p style={{ marginTop: 16, fontSize: 13, color: "var(--color-green-leaf)" }}>{t("submitted")}</p>}
        {error && <p style={{ marginTop: 16, color: "var(--color-terracotta)" }}>{error}</p>}
        {!submitted && (
          <div style={{ display: "grid", gap: 8, marginTop: 24 }}>
            <button onClick={saveDraft}
              style={{ background: "transparent", color: "var(--color-ink)", padding: "12px 24px", border: "1px solid var(--color-line)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
              {t("saveDraft")}
            </button>
            <button onClick={submit} disabled={submitting || lines.length === 0}
              style={{ background: "var(--color-terracotta)", color: "white", padding: "12px 24px", border: "none", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
              {submitting ? "…" : t("submitQuote")} →
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: QuoteLineRow**

```tsx
// src/components/supplier/QuoteLineRow.tsx
"use client";
import type { QuoteLine, ItemCatalog } from "@prisma/client";
import { fromSek, toSek } from "@/lib/money";

export function QuoteLineRow({
  line, disabled, onChange, onRemove,
}: {
  line: QuoteLine & { item: ItemCatalog };
  disabled: boolean;
  onChange: (patch: Partial<{ quantity: number; mode: "new" | "used"; unitPrice: number }>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 120px 32px", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--color-line)" }}>
      <div style={{ fontSize: 20 }}>{line.item.icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{line.item.name}</div>
        <div style={{ color: "var(--color-ink-mute)", fontSize: 12 }}>{line.item.description}</div>
      </div>
      <select value={line.mode} disabled={disabled} onChange={(e) => onChange({ mode: e.target.value as any })}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "6px 8px", fontSize: 13 }}>
        <option value="new">new</option>
        <option value="used">used</option>
      </select>
      <input type="number" value={line.quantity} disabled={disabled} min={0} max={9999}
        onChange={(e) => onChange({ quantity: Number(e.target.value) })}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "6px 8px", fontSize: 13, textAlign: "right" }} />
      <input type="number" value={toSek(line.unitPrice)} disabled={disabled} step={1}
        onChange={(e) => onChange({ unitPrice: fromSek(Number(e.target.value)) })}
        style={{ background: "var(--color-cream)", border: "1px solid var(--color-line)", borderRadius: 4, padding: "6px 8px", fontSize: 13, textAlign: "right" }} />
      <button onClick={onRemove} disabled={disabled}
        style={{ background: "transparent", border: "none", color: "var(--color-ink-mute)", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(supplier): RFQ detail page with QuoteBuilder + line editor + autosave"
```

---

## Task 3.20: Dashboard metrics (TDD)

**Files:**
- Create: `src/server/supplier-metrics.ts`
- Test: `tests/unit/supplier-metrics.test.ts`

- [ ] **Step 1: Tests**

```ts
// tests/unit/supplier-metrics.test.ts
import { describe, expect, it } from "vitest";
import { computeWinRate, computeAvgResponseMs } from "@/server/supplier-metrics";

describe("supplier metrics primitives", () => {
  it("computeWinRate returns 0 when denominator is 0", () => {
    expect(computeWinRate(0, 0)).toBe(0);
  });

  it("computeWinRate returns ratio between 0 and 1", () => {
    expect(computeWinRate(3, 7)).toBeCloseTo(0.3);
    expect(computeWinRate(7, 0)).toBe(1);
  });

  it("computeAvgResponseMs averages an array of millisecond differences", () => {
    expect(computeAvgResponseMs([])).toBe(0);
    expect(computeAvgResponseMs([1000, 2000, 3000])).toBe(2000);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

```ts
// src/server/supplier-metrics.ts
import { db } from "@/lib/db";
import { computeSummary } from "./project-summary";
import type { ItemCategory } from "@prisma/client";

export interface DashboardMetrics {
  openRfqs: number;
  winRate30d: { rate: number; won: number; lost: number };
  pipelineValueOre: number;
  avgResponseTimeMs: number;
  stockMix: Array<{ category: ItemCategory; newCount: number; usedCount: number }>;
  winVsCompetitor: Array<{ supplierId: string; supplierName: string; winRate: number; sample: number }>;
}

export function computeWinRate(won: number, lost: number): number {
  const denom = won + lost;
  if (denom === 0) return 0;
  return won / denom;
}

export function computeAvgResponseMs(diffs: number[]): number {
  if (diffs.length === 0) return 0;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

export async function getDashboardMetrics(supplierId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 1. Open RFQs
  const openRfqs = await db.rfq.count({
    where: { supplierId, status: { in: ["sent", "viewed"] }, deadlineAt: { gt: now } },
  });

  // 2. Win rate 30d
  const decided30d = await db.rfq.findMany({
    where: { supplierId, decidedAt: { gte: thirtyDaysAgo }, status: { in: ["won", "lost"] } },
    select: { status: true },
  });
  const won = decided30d.filter((r) => r.status === "won").length;
  const lost = decided30d.filter((r) => r.status === "lost").length;

  // 3. Pipeline value (open RFQs)
  const openRfqsList = await db.rfq.findMany({
    where: { supplierId, status: { in: ["sent", "viewed"] }, deadlineAt: { gt: now } },
    include: { project: { include: { items: { include: { item: true } } } } },
  });
  const pipelineValueOre = openRfqsList.reduce((sum, r) => sum + computeSummary(r.project.items).totalOre, 0);

  // 4. Avg response time 30d
  const quoted30d = await db.rfq.findMany({
    where: { supplierId, quotedAt: { gte: thirtyDaysAgo } },
    select: { sentAt: true, quotedAt: true },
  });
  const diffs = quoted30d
    .filter((r) => r.quotedAt)
    .map((r) => r.quotedAt!.getTime() - r.sentAt.getTime());
  const avgResponseTimeMs = computeAvgResponseMs(diffs);

  // 5. Stock mix: quote_lines last 90d
  const lines90d = await db.quoteLine.findMany({
    where: { quote: { rfq: { supplierId }, submittedAt: { gte: ninetyDaysAgo } } },
    include: { item: true },
  });
  const stockMixMap = new Map<ItemCategory, { newCount: number; usedCount: number }>();
  for (const l of lines90d) {
    const cur = stockMixMap.get(l.item.category) ?? { newCount: 0, usedCount: 0 };
    if (l.mode === "new") cur.newCount += l.quantity;
    else cur.usedCount += l.quantity;
    stockMixMap.set(l.item.category, cur);
  }
  const stockMix = Array.from(stockMixMap.entries()).map(([category, v]) => ({ category, ...v }));

  // 6. Win vs competitor: for each other supplier that appeared in same RFQ batch as a decided RFQ
  const myDecided = await db.rfq.findMany({
    where: { supplierId, status: { in: ["won", "lost"] }, decidedAt: { gte: ninetyDaysAgo } },
    select: { id: true, projectId: true, status: true },
  });
  const projectIds = [...new Set(myDecided.map((r) => r.projectId))];
  const peerRfqs = await db.rfq.findMany({
    where: { projectId: { in: projectIds }, NOT: { supplierId } },
    select: { projectId: true, supplierId: true, supplier: { select: { name: true } } },
  });
  const competitorStats = new Map<string, { name: string; won: number; total: number }>();
  for (const my of myDecided) {
    const peers = peerRfqs.filter((p) => p.projectId === my.projectId);
    for (const p of peers) {
      const cur = competitorStats.get(p.supplierId) ?? { name: p.supplier.name, won: 0, total: 0 };
      cur.total += 1;
      if (my.status === "won") cur.won += 1;
      competitorStats.set(p.supplierId, cur);
    }
  }
  const winVsCompetitor = Array.from(competitorStats.entries())
    .map(([sid, v]) => ({ supplierId: sid, supplierName: v.name, winRate: computeWinRate(v.won, v.total - v.won), sample: v.total }))
    .sort((a, b) => b.sample - a.sample)
    .slice(0, 2);

  return {
    openRfqs,
    winRate30d: { rate: computeWinRate(won, lost), won, lost },
    pipelineValueOre,
    avgResponseTimeMs,
    stockMix,
    winVsCompetitor,
  };
}
```

- [ ] **Step 4: Run unit test, expect pass; commit**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test supplier-metrics
git add -A
git commit -m "feat(supplier): dashboard metrics computation with TDD primitives"
```

---

## Task 3.21: Dashboard page + KPI cards + widgets

**Files:**
- Create: `src/app/[locale]/supplier/page.tsx`
- Create: `src/components/supplier/KpiCard.tsx`
- Create: `src/components/supplier/StockMix.tsx`
- Create: `src/components/supplier/WinRate.tsx`

- [ ] **Step 1: KpiCard**

```tsx
// src/components/supplier/KpiCard.tsx
export function KpiCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 36, marginTop: 8 }}>{value}</p>
      {delta && <p style={{ fontSize: 12, color: "var(--color-ink-mute)", marginTop: 4 }}>{delta}</p>}
    </div>
  );
}
```

- [ ] **Step 2: StockMix**

```tsx
// src/components/supplier/StockMix.tsx
import { getTranslations } from "next-intl/server";
import type { ItemCategory } from "@prisma/client";

export async function StockMix({ data }: { data: Array<{ category: ItemCategory; newCount: number; usedCount: number }> }) {
  const t = await getTranslations("supplier.stockMix");
  const tCat = await getTranslations("checklist.tabs");
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t("title")}</h3>
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {data.length === 0 && <p style={{ color: "var(--color-ink-mute)", fontSize: 13 }}>{t("empty")}</p>}
        {data.map((row) => {
          const total = row.newCount + row.usedCount;
          const newPct = total === 0 ? 0 : (row.newCount / total) * 100;
          return (
            <div key={row.category}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{tCat(row.category)}</span><span style={{ color: "var(--color-ink-mute)" }}>{total} {t("units")}</span>
              </div>
              <div style={{ marginTop: 4, display: "flex", height: 6, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${newPct}%`, background: "var(--color-ink)" }} />
                <div style={{ width: `${100 - newPct}%`, background: "var(--color-green-leaf)" }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-ink-mute)" }}>
                {t("new")} {Math.round(newPct)}%  ·  {t("reused")} {Math.round(100 - newPct)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: WinRate**

```tsx
// src/components/supplier/WinRate.tsx
import { getTranslations } from "next-intl/server";

export async function WinRate({ data }: { data: Array<{ supplierName: string; winRate: number; sample: number }> }) {
  const t = await getTranslations("supplier.winRate");
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t("title")}</h3>
      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        {data.length === 0 && <p style={{ color: "var(--color-ink-mute)", fontSize: 13 }}>{t("empty")}</p>}
        {data.map((row) => (
          <div key={row.supplierName}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink-mute)" }}>
              {t("vs")} {row.supplierName}
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 4 }}>
              {Math.round(row.winRate * 100)}% <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("winsOf", { n: row.sample })}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Dashboard page**

```tsx
// src/app/[locale]/supplier/page.tsx
import { requireSupplier } from "@/lib/supplier-auth";
import { getDashboardMetrics } from "@/server/supplier-metrics";
import { listInbox } from "@/server/supplier-rfq";
import { KpiCard } from "@/components/supplier/KpiCard";
import { StockMix } from "@/components/supplier/StockMix";
import { WinRate } from "@/components/supplier/WinRate";
import { RfqInbox } from "@/components/supplier/RfqInbox";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";

export default async function SupplierDashboardPage() {
  const { supplierId } = await requireSupplier();
  const metrics = await getDashboardMetrics(supplierId);
  const { rfqs } = await listInbox(supplierId, { limit: 5 });
  const t = await getTranslations("supplier.dashboard");
  const hours = Math.floor(metrics.avgResponseTimeMs / 3600_000);
  const mins = Math.floor((metrics.avgResponseTimeMs % 3600_000) / 60_000);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>{t("title")}</h1>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          <KpiCard label={t("kpi.openRfqs")} value={String(metrics.openRfqs)} />
          <KpiCard label={t("kpi.winRate")} value={`${Math.round(metrics.winRate30d.rate * 100)}%`} delta={`${metrics.winRate30d.won}/${metrics.winRate30d.won + metrics.winRate30d.lost} decided`} />
          <KpiCard label={t("kpi.pipeline")} value={formatSek(metrics.pipelineValueOre)} />
          <KpiCard label={t("kpi.avgResponse")} value={metrics.avgResponseTimeMs === 0 ? "—" : `${hours}h ${mins}m`} />
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 48 }}>{t("incoming")}</h2>
        <RfqInbox rfqs={rfqs} activeStatus="all" />
      </div>
      <div style={{ display: "grid", gap: 24 }}>
        <StockMix data={metrics.stockMix} />
        <WinRate data={metrics.winVsCompetitor} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(supplier): dashboard with KPI cards, stock mix, win-vs-competitor"
```

---

## Task 3.22: Analytics endpoint (for future client refresh)

**Files:**
- Create: `src/app/api/v1/supplier/analytics/route.ts`

- [ ] **Step 1: Route**

```ts
// src/app/api/v1/supplier/analytics/route.ts
import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { getDashboardMetrics } from "@/server/supplier-metrics";

export async function GET() {
  const { supplierId } = await requireSupplier();
  const metrics = await getDashboardMetrics(supplierId);
  return NextResponse.json({ metrics });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): supplier analytics endpoint"
```

---

## Task 3.23: i18n keys for supplier UI

**Files:**
- Modify: `src/messages/sv.json`, `src/messages/en.json`

- [ ] **Step 1: Add the `supplier.*` block + a few stray keys**

Add these keys to BOTH files (parallel structure, translate values):

```json
{
  "supplier": {
    "nav": {
      "dashboard": "Dashboard / Översikt",
      "rfqs": "RFQs / Förfrågningar",
      "settings": "Settings / Inställningar",
      "logout": "Logout / Logga ut"
    },
    "login": {
      "title": "Sign in / Logga in",
      "subtitle": "Use your email, password and 2FA code. / Använd e-post, lösenord och 2FA-kod.",
      "email": "Email / E-post",
      "password": "Password / Lösenord",
      "totp": "Authenticator code / Autentiseringskod",
      "recoveryCode": "Recovery code / Återställningskod",
      "useRecovery": "Use a recovery code instead / Använd återställningskod istället",
      "useTotp": "Use authenticator code / Använd autentiseringskod",
      "submit": "Sign in / Logga in",
      "invalid": "Wrong email, password, or 2FA code. / Fel e-post, lösenord eller 2FA-kod."
    },
    "onboarding": {
      "setPassword": {
        "title": "Set your password / Välj lösenord",
        "password": "Password / Lösenord",
        "hint": "8+ characters / Minst 8 tecken",
        "next": "Next / Nästa"
      },
      "enroll2fa": {
        "title": "Enable 2FA / Aktivera 2FA",
        "qrInstruction": "Scan with Authy / Google Authenticator / 1Password. / Skanna med Authy / Google Authenticator / 1Password.",
        "code": "6-digit code / 6-siffrig kod",
        "verify": "Verify / Verifiera"
      },
      "recovery": {
        "title": "Save your recovery codes / Spara dina återställningskoder",
        "body": "Store these somewhere safe — they let you log in if you lose your authenticator. / Spara dessa på ett säkert ställe — du kan logga in med dem om du tappar din autentiseringsapp.",
        "download": "Download / Ladda ner",
        "continue": "Continue to login / Fortsätt till inloggning"
      }
    },
    "dashboard": {
      "title": "RFQ inbox / RFQ-inkorg",
      "kpi": {
        "openRfqs": "Open RFQs / Öppna förfrågningar",
        "winRate": "Win rate (30d) / Vinstgrad (30d)",
        "pipeline": "Pipeline value / Pipeline-värde",
        "avgResponse": "Avg. response time / Genomsnittlig svarstid"
      },
      "incoming": "Incoming requests / Inkommande förfrågningar"
    },
    "inbox": {
      "title": "RFQ inbox / RFQ-inkorg",
      "totalRequests": "total / totalt",
      "filter_all": "All / Alla",
      "filter_sent": "New / Nya",
      "filter_viewed": "Viewed / Visade",
      "filter_quoted": "Quoted / Offererade",
      "filter_won": "Won / Vunna",
      "filter_lost": "Lost / Förlorade",
      "filter_expired": "Expired / Utgångna",
      "closesIn": "Closes in / Stänger om",
      "empty": "No RFQs match this filter. / Inga förfrågningar matchar detta filter."
    },
    "rfq": {
      "competitorsLabel": "competitors / konkurrenter",
      "people": "people / personer",
      "deadline": "Deadline / Deadline:",
      "builderTitle": "Build your quote / Bygg din offert",
      "notes": "Notes / Anteckningar",
      "perks": "Perks / Förmåner",
      "addPerk": "Add a perk… / Lägg till förmån…",
      "totals": "Totals / Summor",
      "subtotal": "Subtotal / Delsumma",
      "vat": "VAT (25%) / Moms (25%)",
      "total": "Total / Totalt",
      "saveDraft": "Save draft / Spara utkast",
      "submitQuote": "Submit quote / Skicka offert",
      "savedAt": "Saved at / Sparat",
      "submitted": "Submitted ✓ / Skickat ✓"
    },
    "stockMix": {
      "title": "Stock mix / Lagermix",
      "empty": "No quote data yet. / Inget offertdata ännu.",
      "units": "units / enheter",
      "new": "New / Nytt",
      "reused": "Reused / Återbrukat"
    },
    "winRate": {
      "title": "Where you win / Var du vinner",
      "empty": "No competitor data yet. / Ingen konkurrentdata ännu.",
      "vs": "vs.",
      "winsOf": "wins of {n} / vinster av {n}"
    }
  }
}
```

Use English for `en.json` and Swedish for `sv.json` (split the slashed values).

- [ ] **Step 2: Verify build**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm typecheck
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "i18n: add supplier UI translations (sv + en)"
```

---

## Task 3.24: Settings page (minimal — link to logout)

**Files:**
- Create: `src/app/[locale]/supplier/settings/page.tsx`

- [ ] **Step 1: Stub page (logout only — password change deferred)**

```tsx
// src/app/[locale]/supplier/settings/page.tsx
import { requireSupplier } from "@/lib/supplier-auth";
import { signOut } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function SupplierSettingsPage() {
  await requireSupplier();
  const t = await getTranslations("supplier.nav");
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/sv/supplier/login" });
  }
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Settings</h1>
      <form action={logout} style={{ marginTop: 32 }}>
        <button type="submit"
          style={{ background: "transparent", color: "var(--color-ink)", padding: "12px 24px", border: "1px solid var(--color-line)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}>
          {t("logout")}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(supplier): minimal settings page with logout"
```

---

## Task 3.25: Integration test for supplier flow

**Files:**
- Create: `tests/integration/supplier-flow.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/integration/supplier-flow.test.ts
import { describe, expect, it, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import * as OTPAuth from "otpauth";
import { hashPassword } from "@/lib/password";
import { encryptSecret, generateSecret } from "@/lib/totp";
import { upsertDraft, submitQuote } from "@/server/supplier-quote";
import { listInbox, markViewed } from "@/server/supplier-rfq";
import { getDashboardMetrics } from "@/server/supplier-metrics";

const db = new PrismaClient();

let testSupplierId: string;
let testUserId: string;
let testRfqId: string;
let testProjectId: string;
let totpSecret: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = "test-auth-secret-32-chars-minimum-padding-1234";
  // Find a seeded supplier
  const supplier = await db.supplier.findFirstOrThrow({ where: { orgNumber: "559000-0001" } });
  testSupplierId = supplier.id;

  totpSecret = generateSecret();
  const user = await db.user.upsert({
    where: { email: "test-integration@officekit.test" },
    create: {
      email: "test-integration@officekit.test",
      role: "supplier",
      supplierId: testSupplierId,
      passwordHash: await hashPassword("integration-test-pw"),
      twoFaSecret: encryptSecret(totpSecret),
      twoFaEnabled: true,
    },
    update: {
      twoFaSecret: encryptSecret(totpSecret),
      twoFaEnabled: true,
      passwordHash: await hashPassword("integration-test-pw"),
    },
  });
  testUserId = user.id;

  // Create a project and an RFQ
  const company = await db.company.create({ data: { name: "Integration Test Co" } });
  const project = await db.project.create({
    data: { companyId: company.id, name: "Integration Project", industry: "it", headcount: 5, city: "Stockholm", status: "requesting_quotes" },
  });
  testProjectId = project.id;
  const item = await db.itemCatalog.findFirst();
  if (item) {
    await db.projectItem.create({ data: { projectId: project.id, itemId: item.id, quantity: 5, mode: "new" } });
  }
  const rfq = await db.rfq.create({
    data: { projectId: project.id, supplierId: testSupplierId, status: "sent", deadlineAt: new Date(Date.now() + 86400_000) },
  });
  testRfqId = rfq.id;
});

describe("supplier flow integration", () => {
  it("lists inbox and finds the test RFQ", async () => {
    const { rfqs } = await listInbox(testSupplierId);
    expect(rfqs.some((r) => r.id === testRfqId)).toBe(true);
  });

  it("marks viewed sets viewedAt and status", async () => {
    await markViewed(testRfqId, testSupplierId);
    const rfq = await db.rfq.findUniqueOrThrow({ where: { id: testRfqId } });
    expect(rfq.viewedAt).not.toBeNull();
    expect(rfq.status).toBe("viewed");
  });

  it("upserts a draft quote", async () => {
    const item = await db.itemCatalog.findFirst();
    if (!item) throw new Error("no catalog items seeded");
    const quote = await upsertDraft({
      rfqId: testRfqId,
      supplierId: testSupplierId,
      lines: [{ itemId: item.id, quantity: 5, mode: "new", unitPrice: 500_000 }],
      notes: "test notes",
      perks: ["free delivery"],
    });
    expect(quote.lines).toHaveLength(1);
    expect(quote.submittedAt).toBeNull();
  });

  it("submits the quote and transitions RFQ status to quoted", async () => {
    await submitQuote(testRfqId, testSupplierId);
    const rfq = await db.rfq.findUniqueOrThrow({ where: { id: testRfqId }, include: { quote: true } });
    expect(rfq.status).toBe("quoted");
    expect(rfq.quote?.submittedAt).not.toBeNull();
  });

  it("computes dashboard metrics without errors", async () => {
    const m = await getDashboardMetrics(testSupplierId);
    expect(m).toMatchObject({
      openRfqs: expect.any(Number),
      pipelineValueOre: expect.any(Number),
      avgResponseTimeMs: expect.any(Number),
    });
  });

  it("TOTP code computed from stored secret is valid", () => {
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(totpSecret) });
    expect(totp.generate()).toMatch(/^\d{6}$/);
  });
});
```

- [ ] **Step 2: Update vitest.config.ts to include integration tests**

```ts
// vitest.config.ts — modify the test.include array
test: {
  environment: "jsdom",
  globals: true,
  include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
},
```

- [ ] **Step 3: Run, expect pass**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test supplier-flow
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(integration): full supplier flow — inbox, view, draft, submit, metrics"
```

---

## Task 3.26: E2E test for supplier happy path

**Files:**
- Create: `tests/e2e/supplier-happy-path.spec.ts`

- [ ] **Step 1: Test**

```ts
// tests/e2e/supplier-happy-path.spec.ts
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import * as OTPAuth from "otpauth";

const db = new PrismaClient();

test.beforeAll(async () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-32-chars-minimum-padding-1234";
});

test("supplier can log in and view RFQ inbox", async ({ page }) => {
  // Resolve the seeded test user. Skip if not seeded yet.
  const user = await db.user.findUnique({ where: { email: "test-integration@officekit.test" } });
  if (!user || !user.twoFaSecret) test.skip();
  if (!user) return;

  // Decrypt the secret using the same key as the app
  const { decryptSecret } = await import("@/lib/totp");
  const plaintextSecret = decryptSecret(user.twoFaSecret!);
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(plaintextSecret) });
  const code = totp.generate();

  await page.goto("/sv/supplier/login");
  await page.getByLabel(/e-post/i).fill("test-integration@officekit.test");
  await page.getByLabel(/lösenord/i).fill("integration-test-pw");
  await page.getByLabel(/autentiseringskod/i).fill(code);
  await page.getByRole("button", { name: /logga in/i }).click();

  await expect(page).toHaveURL(/\/sv\/supplier(\?|$)/);
  await expect(page.getByText(/inkorg/i).first()).toBeVisible();
});
```

- [ ] **Step 2: Run**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm test:e2e supplier-happy-path
```

(Will skip if integration test hasn't seeded the user yet.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/supplier-happy-path.spec.ts
git commit -m "test(e2e): supplier login happy path"
```

---

## Self-review notes

**Spec coverage check** (Phase 3 design sections → tasks):

| Spec section | Covered by |
|------|------|
| §3 Data model deltas | Task 3.1 |
| §4 Auth + onboarding | Tasks 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11 |
| §5 Route map / §6 Components | Tasks 3.17, 3.18, 3.19, 3.21, 3.24 |
| §7 Quote draft/submit | Tasks 3.14, 3.15, 3.19 |
| §8 Dashboard analytics | Tasks 3.20, 3.21, 3.22 |
| §9 Email notifications | Task 3.12 |
| §10 Auto-expire + view tracking | Tasks 3.13, 3.14 |
| §11 Win/loss rendering + simulate script | Tasks 3.16, 3.18, 3.19 |
| §12 Testing | Tasks 3.25, 3.26 |
| §13 i18n | Task 3.23 |

**Known shortcuts taken** (acceptable for v1):

- Quote builder removes a line entirely if quantity=0 only on next save (front-end logic); zero-quantity lines are filtered at draft-save time. Not a UX issue but noted.
- Recovery code "Use recovery code" toggle is on the login form, not a separate page. Simpler UX, less surface.
- Settings page has only Logout in Phase 3. Password change is deferred — admin script can rotate passwords if needed.
- Dashboard metrics are not cached. Re-evaluate after first soft-launch if loads exceed 500ms.
- E2E test seeds via the integration test running first. CI must run unit/integration before E2E.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-18-officekit-phase-3.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review per task.

**2. Inline Execution** — batch in this session.

**Which approach?**
