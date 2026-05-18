# OfficeKit

Swedish responsive web marketplace for outfitting offices via vetted suppliers.

A buyer picks their industry, specifies headcount, gets a smart starter list of furniture and equipment, refines the list, lays items on a floor plan, and requests quotes from three vetted suppliers. See `docs/superpowers/specs/2026-05-15-officekit-phase-0-1-2-design.md` for the design and `docs/superpowers/plans/2026-05-15-officekit-phase-0-1-2.md` for the implementation plan.

## Quickstart

Requires Node 22+ (`.nvmrc` pins to `22`) and Docker.

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install deps
pnpm install

# 3. Configure env
cp .env.example .env.local
# Generate AUTH_SECRET and paste it into .env.local:
openssl rand -base64 32

# 4. Migrate + seed
pnpm prisma migrate deploy
pnpm db:seed

# 5. Run
pnpm dev
```

Open http://localhost:3000/sv

## Commands

| Command | What |
|--------|------|
| `pnpm dev` | Dev server (Next.js 16) |
| `pnpm build` | Production build |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed catalog + suppliers + admin |
| `pnpm db:studio` | Prisma Studio GUI |

## Architecture

- Next.js 16 App Router, TypeScript strict
- Prisma 7 + PostgreSQL 16 (via Docker Compose or Supabase in prod)
- NextAuth v5 (magic-link via Resend)
- next-intl 3 (Swedish default, English fallback)
- TanStack Query 5 for client-side mutations
- dnd-kit for floor plan
- Vitest + Playwright
- shadcn/ui + Tailwind v4

See `docs/superpowers/specs/2026-05-15-officekit-phase-0-1-2-design.md` for the full design.

## Phase 0+1+2 status

This codebase implements Phase 0 (foundations), Phase 1 (buyer happy path through quote-request stub), and Phase 2 (floor plan). Subsequent phases — supplier dashboard, payments, admin tools — are not yet built.
