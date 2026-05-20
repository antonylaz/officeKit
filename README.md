# OfficeKit

Swedish responsive web marketplace for outfitting offices via vetted suppliers. Phases 0–7 implemented.

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

## Production deploy checklist

1. **Hosting:** Vercel project pointed at GitHub repo
2. **Database:** Supabase Postgres (or Neon). Connection URL → `DATABASE_URL`
3. **Email:** Resend account, domain verified for `officekit.se`. `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
4. **Auth:** `AUTH_SECRET` (32-byte random), `AUTH_URL=https://officekit.se`
5. **Payments:** Stripe account in live mode. Set `STRIPE_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Configure webhook endpoint at `https://officekit.se/api/webhooks/stripe` pointing at events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`, `transfer.paid`. Set `STRIPE_WEBHOOK_SECRET` to the signing secret
6. **Rate limiting:** Upstash Redis project. Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
7. **Error tracking (optional):** Sentry project. Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
8. **Analytics (optional):** PostHog. Set `NEXT_PUBLIC_POSTHOG_KEY`
9. **Build env:** `NEXT_PUBLIC_APP_URL=https://officekit.se`
10. **Run migration on first deploy:** `pnpm prisma migrate deploy`
11. **Seed catalog (one-time):** `pnpm db:seed`

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
