# OfficeKit — Phase 3 Design (Supplier Dashboard)

**Date:** 2026-05-18
**Author:** Antonio Lazeski (with Claude)
**Status:** Approved, ready for implementation planning
**Source spec:** `officekit-spec.pdf` v1.0, sections 4.2, 6.3, 9.3
**Parent design:** `docs/superpowers/specs/2026-05-15-officekit-phase-0-1-2-design.md`

This design covers Phase 3 of OfficeKit: the supplier dashboard end-to-end. Suppliers receive RFQ emails, log in with password + 2FA, see a dashboard of KPIs and analytics, browse incoming RFQs, build and submit quotes, and track win/loss outcomes. Order fulfillment, payments, and admin UI remain out of scope (Phases 4–6).

## 1. Scope

### In scope

- **Supplier authentication**: email + password with mandatory TOTP 2FA, via a NextAuth Credentials provider that coexists with the buyer's existing magic-link provider.
- **Admin-led onboarding**: a CLI script (`pnpm tsx scripts/invite-supplier.ts`) generates one-shot invite tokens. Suppliers visit `/[locale]/supplier/onboarding/[token]` to set password and enroll 2FA. No admin web UI yet — that's Phase 6.
- **Supplier email notifications**: when `fanoutRfqs` creates RFQ rows in Phase 1, each receiving supplier gets an email with a deep link to `/sv/supplier/rfqs/[rfqId]`.
- **Dashboard** at `/[locale]/supplier`: 4 KPI cards (open RFQs, win rate 30d, pipeline value, avg response time), RFQ inbox panel (top 5–7), stock-mix sidebar, win-rate-vs-competitor sidebar. Matches `officekit-supplier-dashboard.pdf` layout.
- **RFQ inbox** at `/[locale]/supplier/rfqs`: full paginated list with status filter (new / viewed / quoted / won / lost / expired).
- **RFQ detail** at `/[locale]/supplier/rfqs/[id]`: project context on the left, quote builder on the right. Line items inherit RFQ items, prices and modes editable. Notes textarea, perks chips, live totals.
- **Quote draft + submit**: opening the RFQ detail upserts a draft Quote row. Edits autosave every 30s via PATCH. Submit sets `submittedAt`, transitions `rfqs.status = quoted`.
- **Auto-expire**: RFQs past `deadlineAt` without a submitted quote are surfaced as `expired` (computed inline on inbox load — no separate cron).
- **Win/loss rendering**: inbox shows won/lost badges. Until Phase 4 wires the buyer-pick endpoint, a dev script `scripts/simulate-buyer-pick.ts` lets us test the state transitions.
- **i18n**: all new UI strings in `sv.json` + `en.json`, matching Phase 0–2 conventions.

### Out of scope (deferred)

| Item | Phase |
|------|-------|
| Order fulfillment status transitions (Confirmed → In production → Shipped → Delivered) | 4 |
| Stripe Connect onboarding for suppliers | 5 |
| Payouts dashboard | 5 |
| Klarna integration | 5 |
| Admin web UI for supplier management | 6 |
| Supplier CSV catalog upload (`supplier_pricing` overrides) | 4 or follow-up |
| Lost-reason capture from buyer | 4 |
| Real-time WebSocket updates | never |
| Supplier mobile app | never |

## 2. Architecture

Same Next.js app, same Postgres, same auth layer as Phase 0–2. Supplier routes live under `src/app/[locale]/supplier/...`. NextAuth gains a second provider (Credentials) for password+TOTP; the buyer magic-link provider stays unchanged. A `requireSupplier()` server helper guards every supplier route by checking session role + `supplierId`.

No new infrastructure dependencies beyond what's already installed. Three new libraries:

- `bcrypt` for password hashing (12 rounds)
- `otpauth` for TOTP generation/verification
- `qrcode` for rendering the TOTP enrollment QR code (server-side render to data URL)

## 3. Data model deltas

One Prisma migration adding four columns:

```prisma
model User {
  // existing fields preserved
  twoFaSecret         String?   @map("two_fa_secret")          // encrypted TOTP secret (AES-256-GCM)
  twoFaRecoveryCodes  String[]  @default([]) @map("two_fa_recovery_codes")  // bcrypt-hashed
  onboardingToken     String?   @unique @map("onboarding_token")
  onboardingExpiresAt DateTime? @map("onboarding_expires_at")
}

model Quote {
  // existing fields preserved
  submittedAt         DateTime? @map("submitted_at")  // null = draft, set = submitted
}
```

**Encryption details for `twoFaSecret`**: AES-256-GCM with a key derived from `AUTH_SECRET` via HKDF (`crypto.hkdfSync('sha256', AUTH_SECRET, salt, 'totp-key', 32)`). Helper in `src/lib/totp.ts`. The encrypted value is stored as `iv:ciphertext:authTag` base64-joined.

**Recovery codes**: 8 codes generated at enrollment, each 10 chars `[A-HJ-NP-Z0-9]` (excluding ambiguous I, O, L for usability). Plaintext shown once at enrollment, stored as bcrypt hashes in the array. On use: linear-search the array, bcrypt-compare each, remove on match.

**Draft vs submitted convention**: a Quote row exists from the moment a supplier opens an RFQ. Its `submittedAt` distinguishes draft from final. The unique constraint on `Quote.rfqId` is preserved (one quote per RFQ per supplier).

## 4. Authentication and onboarding

### Onboarding script

```
pnpm tsx scripts/invite-supplier.ts \
  --email rep@kinnarps-renew.se \
  --supplier-id <uuid> \
  --name "Mikael Andersson"
```

The script:
1. Validates the supplier exists.
2. Upserts a User: email lowercase, `role=supplier`, `supplierId=<uuid>`, name set if provided.
3. Generates a 32-byte URL-safe token, stores it as `onboardingToken`, sets `onboardingExpiresAt = now + 7 days`.
4. Sends an email via Resend with the link `${NEXT_PUBLIC_APP_URL}/sv/supplier/onboarding/${token}`.
5. Prints the link to stdout for manual delivery if SMTP fails.

### Onboarding page

`GET /[locale]/supplier/onboarding/[token]` server-side validates token + expiry. If invalid → 404. If valid → renders a 2-step client wizard:

1. **Set password**: 8+ chars, simple-zxcvbn entropy check. Stored as bcrypt hash (`bcrypt.hash(password, 12)`).
2. **Enroll 2FA**: server generates a fresh TOTP secret, sends back the QR code data URL (`otpauth://totp/OfficeKit:email?secret=...&issuer=OfficeKit`). Supplier scans, enters a 6-digit code. Server verifies. On success: encrypted secret stored, 8 recovery codes generated and displayed once (with copy/download buttons), `twoFaEnabled = true`, `onboardingToken` and `onboardingExpiresAt` cleared. Redirect to login.

### Login

`/[locale]/supplier/login`: a credentials form (email + password). On submit, NextAuth's Credentials provider:

1. Looks up User by email + role=supplier.
2. Bcrypt-compares password.
3. If `twoFaEnabled`, returns an intermediate `"requires_2fa"` state — UI then shows a TOTP field.
4. On TOTP submit: verifies code via `otpauth` library; or accepts a recovery code (consumed on match).
5. Creates session.

Implementation detail: NextAuth Credentials doesn't natively support multi-step flows. Solution: use two server actions — `verifyPassword(email, password)` returns a short-lived signed token (JWT, 5min) representing "password OK, awaiting 2FA". The TOTP form submits that token + the code to `verifyTotp(token, code)`, which signs in via NextAuth if valid.

### Recovery codes

A "Lost your device?" link below the TOTP field accepts a recovery code. Each code is single-use (removed from the array on success).

## 5. Route map

```
src/app/[locale]/supplier/
├── layout.tsx              # supplier-specific shell (sidebar nav, no buyer header)
├── login/page.tsx          # email+password+TOTP
├── onboarding/[token]/page.tsx
├── page.tsx                # dashboard: KPI cards + inbox panel + sidebars
├── rfqs/
│   ├── page.tsx            # full RFQ list with status filter
│   └── [id]/page.tsx       # RFQ detail + quote builder
└── settings/page.tsx       # password change, 2FA reset
```

API endpoints (`src/app/api/v1/supplier/...`):

```
GET    /supplier/rfqs                # inbox; query params: status?, limit?, offset?
GET    /supplier/rfqs/:id            # detail with project, items, competitors count
PATCH  /supplier/rfqs/:id            # mark viewed (idempotent — only sets viewedAt if currently null)
PATCH  /supplier/rfqs/:id/quote      # save draft (autosave) — upserts Quote, updates lines, notes, perks
POST   /supplier/rfqs/:id/quote      # submit — sets submittedAt + rfqs.status=quoted
GET    /supplier/analytics           # dashboard metrics in one call
POST   /supplier/onboarding/verify   # check token validity (server action wrapper)
POST   /supplier/onboarding/complete # finalize: password + 2FA secret + recovery codes
POST   /supplier/auth/totp-verify    # second-factor verification
```

## 6. UI components

```
src/components/supplier/
├── Sidebar.tsx             # left nav: Dashboard, RFQs, Settings, Logout
├── KpiCard.tsx             # one of the 4 dashboard cards
├── RfqInbox.tsx            # table of RFQs with deadline/status; used on dashboard (top 7) and /rfqs (full)
├── RfqRow.tsx              # single row
├── StockMix.tsx            # category bars
├── WinRate.tsx             # vs-competitor + best/weakest vertical
├── QuoteBuilder.tsx        # right column of RFQ detail
├── QuoteLineRow.tsx        # one line in the quote
├── TotpEnroll.tsx          # QR code + verification step of onboarding
└── RecoveryCodesDisplay.tsx
```

Component sizes target ≤ 200 lines each; QuoteBuilder may be the largest.

## 7. Quote draft and submission

**Opening RFQ detail**:
- Server checks for an existing Quote with `rfqId = ?`.
- If none, creates one with `submittedAt = null` and pre-fills `QuoteLine` rows from the project's items (snapshot of catalog prices for the supplier's pricing if `supplier_pricing` exists; otherwise catalog defaults).
- Also runs `PATCH /supplier/rfqs/:id` server-side to mark `viewedAt` (first view only).

**Editing**:
- Quantity, mode, unit price per line are editable on the client.
- Notes and perks editable.
- Removing a line is allowed (e.g., supplier doesn't carry the item).
- 30-second debounced autosave PATCH; returns updated server-computed totals.

**Submit**:
- Client calls `POST /supplier/rfqs/:id/quote`.
- Server validates: at least one line remaining, all line prices set, supplier has `twoFaEnabled = true` (per spec section 9.3: "Supplier 2FA mandatory before first quote can be sent").
- Sets `Quote.submittedAt = now()`, `Quote.totalAmount`, `Quote.totalAmountExVat`, `Quote.validUntil = now + 14d`, `rfqs.status = 'quoted'`, `rfqs.quotedAt = now()`.
- Returns the submitted Quote so the UI can show a confirmation toast.

## 8. Dashboard analytics

A single server function `getDashboardMetrics(supplierId): Promise<DashboardMetrics>` returns:

```ts
type DashboardMetrics = {
  openRfqs: number;
  winRate30d: { rate: number; wonDelta: number; lostDelta: number };
  pipelineValueOre: number;
  avgResponseTimeMs: number;
  stockMix: Array<{ category: ItemCategory; newCount: number; usedCount: number }>;
  winVsCompetitor: Array<{ supplierId: string; supplierName: string; winRate: number }>;
};
```

Implementation:

- **openRfqs**: `count(rfqs)` where `supplierId=?` and `status in ('sent','viewed')` and `deadlineAt > now()`.
- **winRate30d**: count won and lost rows in last 30 days from `rfqs.decidedAt`; rate = `won / (won + lost)`. Returns 0 if denominator is 0.
- **pipelineValueOre**: for each open RFQ, compute the project's total at catalog prices (re-use `computeSummary` from Phase 1). Sum.
- **avgResponseTimeMs**: `avg(quotedAt - sentAt)` in milliseconds for RFQs with `quotedAt` set in last 30 days.
- **stockMix**: in last 90 days, group `quote_lines` by `item.category` × `mode`. Returns up to 6 categories.
- **winVsCompetitor**: for each `other_supplier` that appeared in the same project's RFQ batch as this supplier and had a decision (won or lost) in the last 90 days, compute this supplier's win rate against them. Returns top 2 by RFQ count.

These are 4–6 Prisma queries total. No caching for v1; reassess if dashboard load exceeds 500ms.

## 9. Email notifications

Extend Phase 1's `fanoutRfqs` to send a supplier email per RFQ created.

New template `src/emails/SupplierRfqNotification.tsx`:
- Subject (sv): "Ny offertförfrågan från [Company]"
- Subject (en): "New quote request from [Company]"
- Body: project summary (industry localized label, headcount, city, item count, deadline), deep link to `/sv/supplier/rfqs/[id]`.
- Bilingual: chooses sv/en based on the supplier user's `locale`.

Failure handling: caught and logged. A missing email does not block the DB write or the buyer's confirmation.

## 10. Auto-expire and view tracking

**View tracking**: on `GET /supplier/rfqs/:id`, the server checks `if rfqs.viewedAt is null` and updates atomically: `update rfqs set status='viewed', viewedAt=now() where id=? and viewedAt is null`. This makes the first GET set the timestamp; subsequent GETs are no-ops.

**Auto-expire**: on `GET /supplier/rfqs` (inbox), include a one-line update before the read: `update rfqs set status='expired' where supplierId=? and status in ('sent','viewed') and deadlineAt < now()`. Cheap, idempotent. Future v2 can move to a cron job.

## 11. Win/loss rendering (Phase 4 dependency)

Phase 4 will build the buyer-side quote-pick endpoint that transitions one RFQ to `won` and the others in the same batch to `lost`. Phase 3 implements the supplier-side display of these states (badges, decision date, lost-reason placeholder).

For testing in Phase 3 without Phase 4, a dev script `scripts/simulate-buyer-pick.ts`:

```
pnpm tsx scripts/simulate-buyer-pick.ts --project-id <uuid> --winning-rfq-id <uuid>
```

Sets the winning RFQ to `won`, others to `lost`, project to `ordered`. Prints results. This is dev-only scaffolding, not production code.

## 12. Testing strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | TOTP secret encrypt/decrypt round-trip; recovery code generation, hashing, single-use consumption; password hash + verify; dashboard metric formulas against seeded fixtures; auto-expire logic; win-vs-competitor SQL aggregation |
| Integration | Vitest + test DB | Full supplier flow: onboard → password → 2FA enroll → login → open RFQ → save draft → submit → simulate pick → assert won/lost transitions |
| E2E | Playwright | Supplier login (with seeded supplier + known TOTP secret) → open RFQ → fill quote → submit. One test, mirrors the Phase 3.1 buyer-happy-path test. |

The integration test bypasses the encryption helper to seed a supplier with a known TOTP secret in plaintext, so it can compute valid codes deterministically without depending on production encryption keys.

## 13. i18n

All new strings under existing top-level groups:

```
supplier.nav.dashboard / .rfqs / .settings / .logout
supplier.login.title / .email / .password / .submit / .totp.title / .totp.input / .totp.recoveryLink
supplier.onboarding.setPassword.title / .passwordHint / .next
supplier.onboarding.enroll2fa.title / .qrInstruction / .code
supplier.onboarding.recovery.title / .body / .download / .continue
supplier.dashboard.kpi.openRfqs / .winRate / .pipeline / .avgResponse
supplier.inbox.title / .filterAll / .filterNew / .filterViewed / .filterQuoted / .filterWon / .filterLost / .filterExpired
supplier.rfq.detailTitle / .builderTitle / .saveDraft / .submitQuote / .closesIn / .notes / .perks
supplier.stockMix.title
supplier.winRate.title / .vs / .best / .weakest
```

Estimated ~40 new keys. Add to both `sv.json` and `en.json`.

## 14. Resolved design decisions

| Question | Decision |
|----------|----------|
| Phase 3 scope width | Full supplier dashboard from prototype (auth + inbox + drawer + submit + win/loss + KPIs + analytics) |
| 2FA inclusion | Yes — password + TOTP in Phase 3, mandatory before quote submission |
| 2FA frequency | At login time, not per-quote (the spec's "mandatory before first quote can be sent" = "2FA must be enabled before quotes are allowed") |
| Onboarding | CLI script generates invite token; supplier visits onboarding URL. No admin UI yet. |
| Self-service supplier registration | No — admin-led only for v1 |
| Real-time updates | No — server-rendered with regular page loads |
| Dashboard caching | No — compute on each load; revisit if > 500ms |

## 15. Estimated timeline

| Slice | Duration |
|-------|----------|
| Schema migration + TOTP/password libraries (TDD) | 2 days |
| Onboarding CLI + page + Credentials provider | 3 days |
| Supplier email notification + RFQ inbox + auto-expire | 2 days |
| RFQ detail + quote builder with autosave | 3 days |
| Submit endpoint + win/loss state machine + simulate-pick script | 1 day |
| Dashboard KPIs + analytics | 2 days |
| Stock mix + win-vs-competitor widgets | 1 day |
| Integration test + E2E + i18n cleanup pass | 2 days |
| **Total** | **~16 days = ~2.5 weeks** |

## 16. Next step

Once this design is approved, invoke `superpowers:writing-plans` to produce the step-by-step implementation plan.
