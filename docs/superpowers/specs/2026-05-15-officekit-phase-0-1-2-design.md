# OfficeKit — Phase 0+1+2 Design

**Date:** 2026-05-15
**Author:** Antonio Lazeski (with Claude)
**Status:** Approved, ready for implementation planning
**Source spec:** `officekit-spec.pdf` v1.0 (May 2026)

This design covers the first build slice of OfficeKit: foundations, buyer happy path, and floor plan visualizer. It maps to phases 0, 1, and 2 of the parent spec (section 10). All later phases (supplier dashboard, payments, admin, analytics) are explicitly out of scope here and will get their own design docs.

## 1. Scope

**In scope**

- Repo scaffolding (Next.js 15, TypeScript strict, Tailwind, shadcn/ui, Prisma)
- Full Postgres schema for every table in source-spec section 5
- Seed data: ~50-item catalog (reconstructed from PDFs + Appendix A), 3 mock suppliers, 1 admin user
- NextAuth.js with magic-link (Resend transport)
- i18n via next-intl (sv default, en fallback)
- Design tokens (CSS variables) and base component library
- Buyer flow: landing → industry picker → project basics → checklist → floor plan → request-quotes stub → confirmation
- Floor plan visualizer with dnd-kit
- Stub RFQ fanout (creates 3 `rfqs` rows against seeded mock suppliers, sends confirmation email — no supplier UI yet)
- E2E test for the buyer happy path

**Explicitly out of scope (deferred to later phases)**

- Supplier dashboard, RFQ inbox, quote builder, win/loss analytics
- Stripe Connect, Klarna, order placement, payouts
- Admin tools (user/supplier management, financial reports)
- Real supplier-visible RFQs
- Order tracking UI beyond an empty `/orders` page

## 2. Architecture

One Next.js 15 application deployed on Vercel. App Router. React Server Components by default; Client Components only for interactive surfaces (checklist controls, floor plan canvas, drawers). API surface is Route Handlers under `app/api/v1/`. No separate backend service.

Database: PostgreSQL on Supabase (preferred for branch databases on preview deploys, generous free tier, and optional future use of Storage for catalog images). Prisma is the only DB client — no raw SQL except behind explicit review per source-spec section 9.3.

Email: Resend SDK invoked from server actions and route handlers.

Stripe is not integrated in this slice. Stripe types and tables exist in the schema (per Approach A) but no payment intents are created.

## 3. Project structure

```
officeKit/
├── prisma/
│   ├── schema.prisma          # all section-5 tables
│   ├── migrations/
│   └── seed.ts                # catalog + 3 mock suppliers + 1 admin
├── src/
│   ├── app/
│   │   ├── (marketing)/       # landing, how-it-works, partners
│   │   ├── (buyer)/
│   │   │   ├── start/         # industry picker
│   │   │   ├── projects/[id]/ # checklist, floorplan, request, confirm
│   │   │   └── orders/        # stub UI only this phase
│   │   ├── (auth)/            # magic-link login + callback
│   │   └── api/v1/            # route handlers
│   ├── components/
│   │   ├── ui/                # shadcn primitives
│   │   ├── checklist/
│   │   ├── floorplan/
│   │   └── shell/             # header, footer, sidebars
│   ├── lib/
│   │   ├── db.ts              # prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   ├── i18n.ts
│   │   ├── money.ts           # öre-integer SEK + VAT math
│   │   └── presets.ts         # industry × headcount → quantities
│   ├── server/                # server-only logic (RFQ fanout, etc.)
│   └── messages/              # sv.json, en.json
└── tests/
    ├── unit/                  # vitest
    └── e2e/                   # playwright (buyer happy path)
```

## 4. Data layer

Migrate the full schema from source-spec section 5 in Phase 0, including tables only used in later phases (`quotes`, `quote_lines`, `orders`, `supplier_pricing`). This avoids FK-constraint churn across phases — see Approach A rationale in the brainstorming transcript.

**Conventions**

- UUID primary keys everywhere except `item_catalog.id` (slug-style text PK like `desk-electric`, since the source spec uses these as stable identifiers).
- All money stored as **integer öre** (1 SEK = 100 öre). Per source-spec section 11.7, this avoids float math. UI formatting layer converts to display strings.
- Postgres enums for: `users.role`, `users.locale`, `projects.industry`, `projects.status`, `project_items.mode`, `rfqs.status`, `orders.status`, `orders.payment_method`.
- `created_at` and `updated_at` on every table (Prisma `@updatedAt`).
- `item_catalog.presets` JSONB shape: `{ it: 1, finance: 0.5, sales: 0, law: 1 }` — quantity per person per industry.
- `projects.floor_plan_data` JSONB shape: per source-spec section 5.2.

**Deliberate deviations from source-spec section 5**

- `projects.created_by_user_id` and `companies.created_by_user_id`: **made nullable** (source spec implies NOT NULL). Required to support anonymous browsing — see section 5 below. Backfilled when the buyer authenticates at the quote-request step.
- `projects.claim_token` and `companies.claim_token`: **new TEXT nullable columns** (not in source spec). Holds an opaque session token that ties an anonymous project to the browser session; cleared once `created_by_user_id` is populated on auth. Indexed for fast lookup at auth-callback time.

**Seed data**

- ~50 catalog items reconstructed from PDFs + Appendix A categories + sensible Swedish-office defaults. Reconstruction is explicitly flagged in `prisma/seed.ts` as a known deviation from the source spec, which references `officekit-poc-v2.html` for the canonical list. The catalog can be replaced wholesale later if the HTML is recovered.
- 3 mock suppliers with **clearly fictional** Swedish-style names (e.g. "Nordkontor Demo AB", "Återbruk Möbler Demo", "Stockholm Office Demo"). The source spec names real Swedish distributors as the *target* supplier personas — we deliberately avoid those names in seed data to prevent confusion and any trademark concerns. Replace with real partners post-onboarding in Phase 3.
- 1 admin user for development.

## 5. Auth flow

NextAuth.js with the Email (magic link) provider, using Resend as the SMTP transport.

**Anonymous-browse boundary:** the entire flow from `/` through `/projects/[id]/floorplan` is anonymous. The auth wall is at `/projects/[id]/request` — clicking "Send to 3 suppliers" triggers a magic-link email. Once the buyer authenticates, the in-progress project is claimed under the new user record (its `created_by_user_id` and `companies.created_by_user_id` are populated), and the RFQ fanout fires.

**Anonymous project state:**
1. On first project creation, the server generates a `claim_token` (cryptographically random, URL-safe) and stores it on the `projects` row and a sibling `companies` row, both with `created_by_user_id = null`.
2. The same `claim_token` is set on an HTTP-only, SameSite=Lax cookie scoped to the project's path.
3. All anonymous read/write requests carry the cookie; the server matches `claim_token` to authorize access.
4. At the quote-request step, the buyer enters an email and receives a magic link. The link URL embeds the `claim_token`.
5. On auth callback, the server (a) creates or matches the `users` row, (b) finds all `projects`/`companies` rows whose `claim_token` matches, (c) sets `created_by_user_id` on them, and (d) clears `claim_token`. The cookie is then cleared.
6. If the buyer abandons the flow and returns later from the same browser, the cookie identifies the project. If they switch browsers, the project is orphaned until garbage-collected (a nightly job deletes anonymous projects older than 30 days — implementation detail for the plan).

**Supplier and admin login:** stubbed. NextAuth credentials provider configured for password + 2FA but no UI in this slice. Real flow lands in Phase 3.

**CSRF:** NextAuth's built-in token on state-changing routes.

**Rate limiting:** `/api/v1/auth/magic-link` at 10/min/IP using `@upstash/ratelimit`. Backing store decision (in-memory vs Upstash Redis) deferred to the implementation plan.

## 6. Buyer flow (Phases 1 and 2)

**Route map**

| Path | Spec step | Notes |
|------|-----------|-------|
| `/` | 4.1 step 1 | Landing |
| `/start` | 4.1 step 2 | Industry picker (4 cards) |
| `/projects/new` | 4.1 step 3 | Project basics form; POST creates project, redirect |
| `/projects/[id]/checklist` | 4.1 step 4 | Category tabs, item rows, live summary sidebar |
| `/projects/[id]/floorplan` | 4.1 step 5 | dnd-kit canvas; skip button proceeds to request |
| `/projects/[id]/request` | 4.1 step 6 | Summary + "Send to 3 suppliers" CTA (auth wall) |
| `/projects/[id]/confirmation` | 4.1 step 9 | Success screen with project ID |
| `/orders` | 4.1 step 10 | Stub: empty state in this phase |

**Checklist behavior**

- On first load with a fresh project, the server pre-populates `project_items` from `item_catalog.presets × project.headcount`, rounded up. Buyer can adjust freely.
- Quantity steppers and new/used toggles call REST endpoints (`POST/PATCH/DELETE /api/v1/projects/:id/items`) via TanStack Query's `useMutation`. Cache invalidation on success refetches the project summary.
- Live summary sidebar shows: items selected, new/used split, VAT (25%), total. Computed server-side and returned in the project response on every mutation.
- Industry accent color is set as a CSS variable `--accent` on the page wrapper, sourced from `projects.industry`.

## 7. Floor plan (Phase 2)

**Tech:** dnd-kit core + sortable + modifiers.

**Layout:** CSS grid with 40 cm cells = ~32px (cell size controlled by a CSS variable so we can adjust without code changes). Canvas dimensions from `floor_plan_data.canvas`.

**Palette:** rendered from `project_items` where `quantity > 0`. Each palette item shows "N of M placed", incremented as items land on the canvas.

**Room outlines:** static TS module `lib/room-presets.ts` exports `{ law: [...], finance: [...], it: [...], sales: [...] }` with the room rectangles for each industry. Rendered as faint background outlines on the canvas; they're visual hints only, not interactive.

**Interactions:** drag from palette to canvas, drag placed items to reposition, click to select, Delete/Backspace to remove. Snap-to-grid via dnd-kit modifier.

**Persistence:** floor plan state lives in a `useReducer` on the client. A debounced effect (1s after last change) PATCHes `projects.floor_plan_data` JSONB.

**Skip path:** "Skip floor plan" button navigates directly to `/projects/[id]/request`.

**Performance budget:** 60fps drag at 100 placed items. Achievable with dnd-kit if we avoid re-rendering the whole canvas per drag — each placed item is its own `useDraggable` component, parent canvas only re-renders on drop.

## 8. i18n

`next-intl` v3. Swedish default, English fallback. Locale segment in URL: `/sv/...` and `/en/...`.

- All UI strings in `messages/sv.json` and `messages/en.json`. No hardcoded user-facing strings.
- SEK formatted via `Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' })`.
- Dates formatted via `Intl.DateTimeFormat('sv-SE')`.
- VAT labels: `"moms"` (sv), `"VAT"` (en).

## 9. Testing strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | Money/VAT math, preset → quantity calc, Zod validators |
| Type | TypeScript strict + Prisma + Zod | Compile-time contracts |
| E2E | Playwright | One full buyer happy-path test, seeded test DB |

CI runs lint + typecheck + vitest + playwright on every PR via GitHub Actions. Not in this phase: visual regression, accessibility automation, supplier-side tests.

## 10. Deployment & ops

- **Hosting:** Vercel (Next.js app).
- **Database:** Supabase Postgres, with branch databases for preview deploys.
- **Email:** Resend.
- **Errors:** Sentry. (Spec puts this in Phase 7, but the integration cost is ~10 lines and we want errors from day 1.)
- **Local dev:** Docker Compose Postgres + `pnpm dev`. `.env.example` checked in with every var documented.
- **CI/CD:** GitHub Actions for tests; Vercel's GitHub integration for preview deploys.

## 11. Resolved open questions (source-spec section 12)

Taking spec defaults:

1. Brand: **OfficeKit**
2. Domain: **officekit.se**
3. Logo: **typographic for v1** (no commissioned design yet)
4. Klarna: **deferred to v2** (Phase 5, not in this slice)
5. Supplier onboarding: **admin-led** (Phase 3, not in this slice)
6. Buyer teammates: **no** for v1
7. Quote binding: **yes, with 48h cancel window** (Phase 4, not in this slice)
8. Privacy/terms: **template + light Swedish legal review**

## 12. Known risks and how this design handles them

| Risk | Handling |
|------|----------|
| Source HTML prototypes don't exist; catalog must be reconstructed | Flagged in `seed.ts`; catalog can be replaced wholesale if HTML is recovered. |
| Anonymous → authenticated project handoff at quote-request | `claim_token` on projects/companies + HTTP-only cookie; auth callback backfills `created_by_user_id` and clears the token. |
| Orphaned anonymous projects accumulating | Nightly cleanup job deletes anonymous projects older than 30 days. |
| Floor plan re-render cost at 100 items | Per-item `useDraggable`, canvas re-renders only on drop, not on every dragMove. |
| Schema drift across phases | Full schema migrated in Phase 0, no per-phase additions. |
| Float drift on money | Integer öre everywhere; SEK conversion only at the display layer. |
| Magic-link spam | Rate limit 10/min/IP on the magic-link endpoint. |

## 13. Estimated timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Phase 0 — Foundations | 1 week | Repo, schema, seed, auth scaffold, i18n, design tokens, base components |
| Phase 1 — Buyer happy path | 2 weeks | Landing → request-quotes stub end-to-end |
| Phase 2 — Floor plan | 1 week | dnd-kit canvas with persistence |

**Total: ~4 weeks** for a single full-stack developer (or AI agent + human reviewer).

## 14. Next step

Once this design is approved, invoke `superpowers:writing-plans` to produce the step-by-step implementation plan.
