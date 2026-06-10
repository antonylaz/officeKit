# OfficeKit

Swedish responsive web marketplace for outfitting offices via vetted suppliers. Phases 0–21 implemented (buyer flow, AI office builder, resale marketplace, supplier portal with quote templates, BankID auth, admin console, buyer + seller email notifications).

## Quickstart (local dev)

Requires Node 22+ (`.nvmrc` pins to `22`) and Docker.

```bash
docker compose up -d                # start Postgres
pnpm install                        # install deps
cp .env.example .env.local           # configure env
openssl rand -base64 32             # generate AUTH_SECRET, paste into .env.local
pnpm prisma migrate deploy
pnpm db:seed
pnpm db:download-images  # one-time: fetch ~40 product images to public/variants/
pnpm dev
```

Open http://localhost:3000/sv

## Commands

| Command | What |
|--------|------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm test` | Vitest unit + integration |
| `pnpm test:e2e` | Playwright E2E (incl. axe a11y scans) |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed catalog + suppliers + admin |
| `pnpm db:studio` | Prisma Studio GUI |

## Inviting suppliers / admins

```bash
# Invite a supplier
pnpm tsx scripts/invite-supplier.ts --email rep@kinnarps-renew.se --supplier-id <uuid> --name "Mikael Andersson"

# Invite an admin (no supplier-id needed)
pnpm tsx scripts/invite-supplier.ts --email admin@officekit.se --role admin --name "Admin"
```

## Production deploy (Vercel)

Three real prereqs and one nice-to-have. Everything else degrades gracefully if unset.

### 0. Verify env before deploying

```bash
pnpm deploy:check
```

Exits non-zero if any **required** var is missing. Warns (but allows deploy) on **recommended**/**optional** vars — the corresponding feature just won't work.

### 1. Provision

| Service | Role | Free-tier OK? |
|---|---|---|
| **Vercel** | host | ✓ |
| **Neon** or **Supabase** | Postgres | ✓ |
| **Resend** | transactional email (magic links, listings, status updates, password resets) | ✓ at 100/day |
| **Anthropic Console** | `/ai-build` route (Claude Opus 4.7) | pay-per-use |

### 2. Required env (Vercel → Settings → Environment Variables → Production)

```env
DATABASE_URL=postgresql://...        # Neon / Supabase
AUTH_SECRET=...                      # openssl rand -base64 32
AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Recommended env (most features need these)

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="OfficeKit <hello@your-domain.com>"   # Must be on a Resend-verified domain
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Optional env (per-feature)

| Feature | Vars |
|---|---|
| **Swedish BankID** | `CRIIPTO_ISSUER`, `CRIIPTO_CLIENT_ID`, `CRIIPTO_CLIENT_SECRET` — get from [criipto.com](https://dashboard.criipto.com); redirect URI is `{AUTH_URL}/api/auth/callback/bankid-se`. Without these the BankID button on `/sign-in` shows as disabled with helper text. |
| **Stripe payments** | `STRIPE_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Webhook endpoint: `{AUTH_URL}/api/webhooks/stripe` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`, `transfer.paid`. Without these, payments run in stub mode. |
| **Rate limiting** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Without these the rate limiter is process-local (fine on Vercel single-region, breaks at scale). |
| **Error tracking** | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| **Analytics** | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

### 5. Build + migrate

The `vercel.json` already runs `prisma migrate deploy && next build`, so the database schema is migrated on every deploy. The first deploy will run all 8 migrations.

### 6. Seed the catalog (first-time only)

After the first successful deploy, seed catalog + suppliers locally pointed at production DB:

```bash
DATABASE_URL=<prod-url> pnpm db:seed
DATABASE_URL=<prod-url> pnpm db:download-images   # downloads to public/variants — commit then redeploy
```

### 7. Invite the first admin

```bash
DATABASE_URL=<prod-url> pnpm tsx scripts/invite-supplier.ts --email you@your-domain.com --role admin --name "Admin"
```

Open the magic-link in your inbox to claim the admin account.

## Soft launch checklist (1 buyer + 3 suppliers)

See [docs/SOFT_LAUNCH.md](./docs/SOFT_LAUNCH.md).

## Architecture

- Next.js 16 App Router
- PostgreSQL 16 via Prisma 7 (pg adapter)
- NextAuth v5 (magic-link for buyers, password+TOTP for suppliers/admins)
- next-intl 3 (Swedish default)
- TanStack Query 5 for client mutations
- dnd-kit for floor plan
- Stripe (Connect Express marketplace + Klarna via PaymentMethod)
- Resend for transactional email
- Vitest + Playwright (with @axe-core/playwright for a11y)

See `docs/superpowers/specs/` for the design documents covering each phase.
