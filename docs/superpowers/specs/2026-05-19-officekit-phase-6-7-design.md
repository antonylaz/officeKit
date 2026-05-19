# OfficeKit — Phase 6+7 Design (Admin + Polish/Beta)

**Date:** 2026-05-19
**Status:** Approved (blanket authorization)
**Source spec:** sections 4.3 (admin), 6.4, 9 (NFRs), 10 (Phases 6+7)

Combined design: Phase 6 (admin dashboard + tools) and Phase 7 (production-readiness polish). Treating as one slice because they share the same shipping prerequisite — "everything in working state for soft launch."

## 1. Phase 6: Admin

### Scope
- Admin role login (reuse Credentials provider; `role=admin` users land at `/[locale]/admin` instead of supplier)
- `/[locale]/admin` dashboard: GMV (gross merchandise value) this month + YTD, active suppliers count, open RFQs platform-wide, conversion funnel (RFQs sent → quotes received → orders placed)
- `/[locale]/admin/suppliers` — list with status (Active / Paused / Pending), click to edit (name, commissionRate, active flag), view their RFQs
- `/[locale]/admin/orders` — list with filters (status, supplier, date range), click to view detail, manual status override, refund button (calls Phase 5 refund endpoint)
- `/[locale]/admin/buyers` — list registered buyers, view their projects
- `/[locale]/admin/financials` — revenue (sum commission) by month, payout queue (pending transfers), CSV export
- PostHog event tracking on key actions: `project_created`, `quote_submitted`, `order_placed`, `order_delivered`
- Auth: admin gets the existing magic-link OR password+TOTP (whichever they prefer; we'll support both because `role=admin` users can use either)

### Out of scope (admin) — defer to v2
- User impersonation
- Audit log UI (we'll add a simple `admin_actions` table for write tracking; no UI yet)
- Email blast to users
- Catalog item CRUD UI

### Routes
```
src/app/[locale]/admin/
├── layout.tsx                  # admin shell with sidebar
├── page.tsx                    # dashboard
├── suppliers/page.tsx
├── suppliers/[id]/page.tsx
├── orders/page.tsx
├── orders/[id]/page.tsx
├── buyers/page.tsx
└── financials/page.tsx
src/app/api/v1/admin/
├── metrics/route.ts            # dashboard KPIs
├── suppliers/[id]/route.ts     # PATCH: edit, toggle active
├── orders/[id]/status/route.ts # PATCH: manual override
├── financials/export/route.ts  # GET: CSV
└── orders/[id]/refund/route.ts # already created in Phase 5
```

### Data deltas
None — all queries from existing tables.

### Admin login flow
Admin uses the same `/supplier/login` page. Since the Credentials provider only matches `role=supplier`, we need to update it to ALSO match `role=admin` and route admins to `/admin` post-login (vs suppliers to `/supplier`).

Update `src/lib/auth.ts` Credentials authorize:
- Find user where `role IN ('supplier', 'admin')`
- Return user with role and supplierId (null for admin)

Update post-login redirect logic in the login form — check session.user.role and route accordingly.

Alternative: a separate `/admin/login` page that uses the same Credentials provider. Simpler — let's do that.

## 2. Phase 7: Polish

### Scope
- **Empty states**: review every list page, add a clean empty state. Already done for: orders, supplier RFQ inbox, supplier orders, supplier payouts. Confirm: admin pages (will be done in Phase 6 tasks), industry-card edge cases.
- **Loading states**: Next.js `loading.tsx` files in route groups. Add for: `/projects/[id]/checklist`, `/projects/[id]/quotes`, `/supplier`, `/supplier/rfqs`, `/admin`. Use a simple "Loading..." with a subtle spinner.
- **Error boundaries**: Next.js `error.tsx` in each route group. Show error + "Try again" + link home.
- **Sentry**: wrap `next.config.ts` with `withSentryConfig`. Skip the build-time source-map upload (needs Sentry org auth); just wire the runtime instrumentation.
- **a11y audit**: programmatic check — install `@axe-core/playwright` and add 1-2 axe scans to existing Playwright tests. Manual scan of: buyer landing, checklist, supplier login.
- **Performance budgets**: skip formal Lighthouse; just verify the dev server renders in <3s and the prod build finishes.
- **README ops checklist**: production deploy steps (Vercel + Supabase + Resend + Stripe keys + env file)
- **Production environment matrix**: document required env vars for prod (separate from `.env.example` if needed)
- **Soft launch checklist**: a Markdown checklist for the 1-buyer + 3-supplier launch (1. invite 3 suppliers via CLI, 2. ensure Resend domain verified, 3. ensure Stripe live keys, 4. seed-prep, etc.)
- **GitHub workflow**: CI already exists — verify it still passes. Add Playwright as a separate job (already done in Phase 0).

### Out of scope (polish)
- Lighthouse perf score chasing
- Full accessibility audit (manual + 3rd-party)
- Visual regression testing
- Load testing

## 3. Architecture

Nothing structural changes. Admin routes follow the same pattern as `/supplier/*`. Polish work is additive — loading/error files, env docs, a Sentry wrap.

## 4. PostHog

`src/lib/analytics.ts` exports a `track(event, props)` helper. Server-side calls go through PostHog's Node SDK. Client-side calls go through `posthog-js`. Gated behind `NEXT_PUBLIC_POSTHOG_KEY` — no-op when unset.

Events to wire:
- `project_created` — server, after project create
- `quote_submitted` — server, after quote submit
- `order_placed` — server, after order placement
- `order_delivered` — server, on status transition
- `supplier_logged_in` — server, on credentials success
- `magic_link_sent` — server, after Resend send

## 5. CSV export format

Admin /financials/export returns text/csv with columns:
`order_id,created_at,company_name,supplier_name,status,total_sek,commission_sek,payout_sek,payment_method,stripe_payment_intent,stripe_transfer`

One row per order.

## 6. Tests

- Unit: GMV computation (sum orders.totalAmount where status != cancelled), funnel math
- Integration: admin endpoint for refund hits the right path
- E2E: deferred (admin UI doesn't need E2E for v1)

## 7. Combined timeline

| Slice | Days |
|-------|------|
| Phase 6 — admin shell + dashboard + KPIs | 1.5 |
| Phase 6 — suppliers/orders/buyers/financials pages | 1.5 |
| Phase 6 — CSV export + PostHog | 0.5 |
| Phase 7 — loading + error files | 0.5 |
| Phase 7 — Sentry wrap + axe + README ops | 1 |
| Phase 7 — soft-launch checklist | 0.5 |
| **Total** | **~5.5 days = ~1 week** |

## 8. Resolved decisions

- Admin uses /admin/login (separate from /supplier/login) for clarity
- Admin role users get magic-link OR password (whichever they were set up with) — but for v1, all admin users use password+TOTP (created via `scripts/invite-supplier.ts` with `--role admin` flag — small CLI extension)
- CSV export: synchronous, no streaming (v1 will have < 10k orders)
- PostHog: optional, gated on env var
- Sentry: same — gated on env var via existing skeleton from Phase 0
- a11y: light scan + key pages; full audit is post-launch

---

This is the final design before MVP ship.
