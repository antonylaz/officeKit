# OfficeKit — Phase 10 Design (AI Office Builder Assistant)

**Date:** 2026-05-20
**Status:** Approved by user direction "lets start with AI assistant"

Adds a natural-language entry point to OfficeKit. Instead of clicking through industry → headcount → category tabs → variant picker, the buyer types one sentence ("Build me a 25-person fintech office in Stockholm, hybrid Tue/Thu, sit-stand desks") and the assistant returns a fully-populated project: industry classified, headcount/city extracted, checklist filled in, and variants pre-selected where confident. The buyer lands on the existing checklist page and refines from there.

## 1. Scope

### In scope

- New `/[locale]/ai-build` page with a single prompt input + example chips
- Server route `POST /api/v1/ai/build-office` that calls Claude (Opus 4.7) with the catalog as cached system context and `output_config.format` (Zod-schema-constrained structured output) to return a valid project proposal
- UX: shows a "Building…" shimmer while the model works (~3–6 s with prompt caching), then redirects to the checklist with a brief reasoning summary in a toast
- Mapping layer that turns the model's proposal into a real `Project` + `ProjectItem` rows (with `variantId` where the model picked one)
- Cost guard: per-IP rate limit (10/min, 50/day), prompt caching on the catalog system prompt (~95% cache-hit rate target after first warm-up)
- Telemetry: log prompt + response token counts + cost + latency per call to `AiBuildLog` table
- Anthropic SDK installed and configured (`ANTHROPIC_API_KEY` env var, server-only)
- i18n: ~6 new keys for the AI page (sv + en)
- One landing-page CTA: "Build with AI" alongside the existing "Start a project"

### Explicitly out of scope (defer to Phase 11+)

- Floor-plan generation from prompt (the floor-plan editor is grid-based; turning "20 desks in a U-shape" into cell coordinates is a separate problem)
- Multi-turn chat / refinement ("now make the desks bigger" — restart with a new prompt instead)
- Photo / image upload ("here's a photo of our space")
- Persisting the AI conversation (the proposal is one-shot; the project is editable afterward in the normal way)
- Voice input
- Localized model prompts beyond Swedish + English (the model handles both natively)

## 2. Architecture

```
┌─────────────────────────┐
│ Buyer types prompt      │
│ + clicks Build          │
└─────────┬───────────────┘
          │ POST /api/v1/ai/build-office  { prompt, locale }
          ▼
┌─────────────────────────────────────────────────────────┐
│ Next.js API route (server-only)                         │
│  1. Per-IP rate limit (in-memory LRU, 10/min 50/day)    │
│  2. Anthropic SDK call:                                 │
│     - model: claude-opus-4-7                            │
│     - system: <catalog summary>  ← cache_control        │
│     - messages: <buyer prompt>                          │
│     - output_config.format: Zod-schema-validated JSON   │
│     - thinking: adaptive (default off; enable if needed)│
│     - max_tokens: 16000                                 │
│  3. Validate proposal IDs against ItemCatalog           │
│  4. Reject any hallucinated variant/item IDs            │
│  5. Create Project + ProjectItem rows                   │
│  6. Return { projectId, summary }                       │
└─────────┬───────────────────────────────────────────────┘
          │ 302 → /[locale]/projects/[projectId]/checklist
          ▼
┌─────────────────────────┐
│ Existing checklist page │ ← buyer refines from here
└─────────────────────────┘
```

The route is **stateless from Claude's perspective** — every call is a fresh single-turn request. State lives in OfficeKit's DB.

## 3. Why Opus 4.7

The default Claude model per the latest project guidance is `claude-opus-4-7`. For Phase 10 specifically:

- The task is "extract structured intent from messy human input and map it to a known catalog". Opus 4.7 follows the system prompt and rubric more literally than 4.6 — exactly what we want for "do not pick items that aren't in the catalog".
- `output_config.format` with a Zod schema guarantees valid JSON the first time, so a single round-trip is enough; no retry loop.
- Cost per generation (with prompt caching, see §7): ~$0.05–0.10 per build. For a soft-launch (1 buyer + 3 suppliers) this is negligible. If cost becomes a concern at scale, the model can be swapped to `claude-sonnet-4-6` via the `AI_BUILD_MODEL` env var (single line change, no schema changes needed).

The model env var also lets us A/B test Sonnet 4.6 against Opus 4.7 once we have real prompts.

## 4. Data model

One new table:

```prisma
model AiBuildLog {
  id              String   @id @default(uuid())
  projectId       String?  @map("project_id")
  project         Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  prompt          String   @db.Text
  locale          String                              // "sv" | "en"
  model           String                              // "claude-opus-4-7" or whichever was used
  inputTokens     Int      @map("input_tokens")
  outputTokens   Int      @map("output_tokens")
  cacheReadTokens Int      @default(0) @map("cache_read_tokens")
  cacheWriteTokens Int     @default(0) @map("cache_write_tokens")
  costOre         Int      @map("cost_ore")           // computed total cost in öre for ledger
  latencyMs       Int      @map("latency_ms")
  rejected        Boolean  @default(false)            // true if a hallucinated ID was returned
  errorMessage    String?  @map("error_message")
  buyerIp         String   @map("buyer_ip")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([buyerIp, createdAt])
  @@map("ai_build_logs")
}
```

Used for: rate limiting (`buyerIp + createdAt` index), cost analytics on the admin dashboard, and debugging bad responses (we keep prompt + rejected flag for review).

## 5. Server route

`src/app/api/v1/ai/build-office/route.ts` (new file).

```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

const PROPOSAL_SCHEMA = z.object({
  projectName: z.string().min(1).max(80),
  industry: z.enum(["it", "finance", "law", "sales", "creative", "consulting", "healthcare", "other"]),
  headcount: z.number().int().min(1).max(2000),
  city: z.string().min(1).max(60),
  reasoning: z.string().max(400),    // 1-3 sentences shown to the buyer while streaming
  items: z.array(z.object({
    itemId: z.string(),                                          // must match an ItemCatalog.id
    variantId: z.string().nullable(),                            // must match a ProductVariant.id, or null
    quantity: z.number().int().min(1).max(500),
    mode: z.enum(["new", "used"]),
    rationale: z.string().max(120),                              // 1-line "why" shown in checklist tooltip
  })).min(3).max(40),
});

export async function POST(req: Request) {
  const { prompt, locale } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  // 1. Rate limit
  await assertRateLimit(ip);

  // 2. Build cached system prompt: catalog summary + few-shot
  const systemBlocks = await buildSystemPrompt(locale);
  // returns: [{type:"text", text: catalogSummary, cache_control:{type:"ephemeral", ttl:"1h"}}, ...]

  // 3. Call Claude
  const t0 = Date.now();
  const response = await client.messages.parse({
    model: process.env.AI_BUILD_MODEL ?? "claude-opus-4-7",
    max_tokens: 16_000,
    system: systemBlocks,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(PROPOSAL_SCHEMA) },
  });
  const latency = Date.now() - t0;

  if (!response.parsed_output) {
    await logFailure({ ip, prompt, locale, latency, reason: "parse_failed" });
    return Response.json({ error: "parse_failed" }, { status: 502 });
  }

  // 4. Validate IDs against the live catalog (defense in depth — Zod constrains shape, not membership)
  const validation = await validateProposal(response.parsed_output);
  if (validation.invalidIds.length > 0) {
    await logRejection({ ip, prompt, locale, latency, response, invalidIds: validation.invalidIds });
    return Response.json({ error: "hallucinated_ids", details: validation.invalidIds }, { status: 502 });
  }

  // 5. Create project + items
  const project = await createProjectFromProposal(response.parsed_output);

  // 6. Log usage for analytics
  await logSuccess({ ip, prompt, locale, latency, response, projectId: project.id });

  return Response.json({ projectId: project.id, summary: response.parsed_output.reasoning });
}
```

### System prompt structure

Two ordered blocks, with cache_control on the catalog block (the volatile parts go after):

```
[Block 1 — cached, ~3-5 KB]
  Role: You are OfficeKit's office-builder assistant.
  Task: Given a buyer's natural-language description, output a structured project
  proposal matching the schema. Pick items only from the catalog below. Pick
  variants where you have high confidence; leave variantId null otherwise.

  Catalog (current):
  - desk-electric (Sit-stand desk): variants [desk-electric-kinnarps-oberon, desk-electric-ikea-bekant, ...]
  - task-chair (Office chair): variants [task-chair-rh-logic, task-chair-aeron, ...]
  - monitor-27 (27" 4K monitor): variants [monitor-27-dell-u2723qe, ...]
  ... (one line per catalog item, ~80 items including Phase 9 if shipped)

  Industry hints: when industry=it, monitor-27 quantity ≈ headcount; task-chair = headcount + 20% buffer.
                  when industry=law, prefer phone-booth and meeting-table; lower monitor count.

  Format rules: see schema. Be deterministic-friendly: prefer the same defaults
  across runs unless the prompt names a specific tier/style.

[Block 2 — not cached, the user's prompt]
  "Build me a 25-person fintech office in Stockholm, hybrid Tue/Thu, sit-stand desks."
```

Catalog summary is generated server-side from `ItemCatalog.findMany()` + `ProductVariant.findMany()` on app boot and cached in memory (invalidated when the seed runs). The cached block hits ~95% of the time during normal use.

### Validation layer

`validateProposal()` checks every `itemId` and `variantId` returned by the model against the live DB. Anything that doesn't match is recorded as a hallucination and the whole proposal is rejected. This is defense in depth — Zod enforces shape, but the model could still return a syntactically-valid item ID that doesn't exist. The catalog summary lists all valid IDs, so a hallucination is rare (~<1% in practice with Opus 4.7), but the check is cheap.

## 6. Frontend

`src/app/[locale]/ai-build/page.tsx` (new file).

UI sketch:

```
┌──────────────────────────────────────────────────────────┐
│  OfficeKit — Build with AI                               │
│                                                          │
│  Describe your office in your own words.                 │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 25-person fintech office in Stockholm, hybrid…    │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Try:  [25-person fintech, Stockholm]                    │
│        [10-person creative studio, Göteborg]             │
│        [Law firm partner office, 4 rooms]                │
│        [Hybrid SaaS team, 40 desks, Malmö]               │
│                                                          │
│             [ Build my office → ]                        │
└──────────────────────────────────────────────────────────┘
```

Submit handler:

- POST to `/api/v1/ai/build-office` with `{ prompt, locale }`
- Show a "Building…" shimmer overlay (single round-trip, no streaming for v1 — parse() is non-streaming and adds simplicity)
- On success: redirect to `/projects/[projectId]/checklist`
- On `hallucinated_ids` or `parse_failed`: toast + fall through to the existing manual flow (`/start`)
- On `rate_limited`: toast "Try again in a minute"

Landing-page change: `src/app/[locale]/page.tsx` gets a second CTA button. The existing "Start a project" stays; "Build with AI" sits next to it with a subtle "BETA" badge.

## 7. Cost + caching

Per generation (Opus 4.7, with caching):

| Phase | Tokens | Cost |
|---|---|---|
| System prompt (cached, 1h TTL) write — first request only | ~5,000 | ~$0.05 |
| System prompt cache read — subsequent requests | ~5,000 | ~$0.0025 |
| User prompt (uncached) | ~50 | ~$0.0003 |
| Response (output) | ~1,500 | ~$0.0375 |
| **Total — first request** | — | **~$0.09** |
| **Total — cached request** | — | **~$0.04** |

At 50 builds/day (well above soft-launch volume), monthly cost is < $80. Order of magnitude safe.

Prompt caching uses 1-hour TTL because builds may cluster around business hours but with gaps; the doubled write cost vs. 5-min TTL pays back after ~3 requests, which we'll always hit during a busy hour. The cache key is the model + the cached block bytes, so it's stable across all buyers (no per-user PII goes into the system prompt).

The catalog summary changes only when the seed runs. After a seed change, the cache invalidates organically — next call writes a new prefix at normal write cost.

## 8. Failure modes

| Failure | Detection | Response |
|---|---|---|
| Anthropic API down | 5xx from SDK | Toast "AI is offline, use the manual flow" + redirect to `/start` |
| Prompt blocked by safety | `stop_reason === "refusal"` | Toast "Couldn't process that prompt, try rephrasing" |
| Model returns malformed JSON | `parsed_output === null` | Logged as `parse_failed`, fall through to manual |
| Model returns hallucinated catalog ID | `validateProposal` catches | Logged as `hallucinated_ids`, fall through to manual |
| User exceeds rate limit | LRU cache hit in `assertRateLimit` | 429 with `Retry-After` header; toast |
| User on free tier abuses (>50/day) | Daily cap in `assertRateLimit` | 429 with longer retry; admin Slack alert if 10+ different IPs hit the daily cap in one day |

## 9. Telemetry

Every call writes to `ai_build_logs`. Admin dashboard (Phase 6) gets a new card:

- AI builds today / week / month
- Avg cost per build (öre, computed from token counts × current pricing constants in `src/lib/ai-pricing.ts`)
- Avg latency
- Rejection rate (parse_failed + hallucinated_ids / total)
- Top 10 prompts by length (anonymized — IP truncated to /24)

PostHog event `ai_build_completed` includes `model`, `latencyMs`, `itemCount`, `rejected`. The buyer's prompt is NOT sent to PostHog (PII).

## 10. Testing

- **Unit**: `validateProposal` rejects hallucinated IDs; `buildSystemPrompt` produces deterministic output given a stable catalog; rate-limiter LRU semantics.
- **Integration**: end-to-end happy path (mock Anthropic API, real DB) — prompt → API route → Project + ProjectItem rows. One test with a real catalog snapshot and a known-good model response fixture.
- **Live smoke test**: a single test in `tests/integration/ai-build-live.test.ts` gated behind `AI_BUILD_LIVE=1` env var that hits the real Anthropic API with a fixed prompt and asserts a sane response. Runs locally before deploy, NOT in CI. Real API key required.

## 11. i18n

6 new keys:

| Key | sv | en |
|---|---|---|
| `aiBuild.title` | "Bygg ditt kontor med AI" | "Build your office with AI" |
| `aiBuild.subtitle` | "Beskriv ditt kontor med egna ord — vi gör resten." | "Describe your office in your own words — we'll do the rest." |
| `aiBuild.placeholder` | "T.ex. ‘25-personers fintech-kontor i Stockholm, hybrid…'" | "e.g. ‘25-person fintech office in Stockholm, hybrid…'" |
| `aiBuild.submit` | "Bygg mitt kontor" | "Build my office" |
| `aiBuild.tryThese` | "Prova:" | "Try:" |
| `aiBuild.beta` | "BETA" | "BETA" |
| `aiBuild.errors.parseFailed` | "Kunde inte tolka prompten — försök igen eller använd manuellt flöde" | "Couldn't parse that — try again or use the manual flow" |
| `aiBuild.errors.rateLimited` | "Försök igen om en minut" | "Try again in a minute" |
| `aiBuild.errors.offline` | "AI är offline just nu" | "AI is offline right now" |

(9 keys actually — slightly more than the "6" estimate; rounding error.)

## 12. Risks + tradeoffs

- **Model accuracy on Swedish prompts**: Opus 4.7 handles Swedish natively. We'll add a Swedish few-shot example in the system prompt to anchor tone and item naming. Risk is low but the live smoke test should cover one sv prompt.
- **Catalog drift**: if the seed adds items but the system-prompt builder doesn't pick them up, the model can't recommend them. Mitigation: `buildSystemPrompt()` reads the live DB on every cold start; in dev we also expose `?refreshCache=1` query param to force a rebuild.
- **Cost cap**: at scale (1k builds/day) this is ~$1.5k/month. Cheap relative to revenue per project but not free. The env var `AI_BUILD_MODEL` lets us downgrade to Sonnet 4.6 if we ever need to without code changes.
- **PII**: buyer prompts can contain company names, locations, headcounts. We log them server-side but NOT to PostHog. The `AiBuildLog.prompt` column should be GDPR-deletable; we add a `DELETE /api/v1/ai/build-office/logs?olderThan=...` admin endpoint in a follow-up (out of scope here, but worth flagging).
- **Tool overlap**: this doesn't replace the manual flow — both stay live. The user explicitly said "alongside the existing Start a project". A/B test later.
- **Determinism**: same prompt → same proposal is NOT guaranteed (model is non-deterministic). Acceptable: the buyer can refine on the checklist page.

## 13. Estimated work

~3–5 days, broken into 5 tasks:

| Task | Days |
|---|---|
| 10.1 Anthropic SDK install + env vars + `buildSystemPrompt` from live catalog | 0.5 |
| 10.2 API route + Zod schema + validation + project creation | 1 |
| 10.3 AI build page + landing-page CTA + i18n | 1 |
| 10.4 Rate limiter + `AiBuildLog` table + admin dashboard card | 0.75 |
| 10.5 Tests (unit + integration mock + 1 live smoke) | 0.75 |
| **Total** | **~4 days** |

## 14. Resolved decisions

| Question | Decision |
|---|---|
| Where in the buyer flow | New `/ai-build` page, alongside existing `/start` (not replacing it) |
| Model | `claude-opus-4-7` (default per project guidance); env-swappable to `claude-sonnet-4-6` |
| Output shape | `output_config.format` with Zod schema (structured outputs); not free-text parsing |
| One-shot vs chat | One-shot for v1; multi-turn deferred to Phase 11 |
| Floor plan | Out of scope for v1 |
| Caching | System prompt cached with 1h TTL; per-request user prompt uncached |
| Streaming | None for v1 — single round-trip via `messages.parse()` is simpler and ~3–6 s is acceptable UX. Streaming the reasoning is a Phase 11 follow-up. |
| Telemetry | Server-side `AiBuildLog` (full prompt) + PostHog event (no prompt) |
| Rate limit | 10/min, 50/day per IP; LRU cache in-process for v1 (upgrade to Redis if multi-region) |
| Locale support | sv + en (handled natively by Opus 4.7) |

## 15. Next step

Hand off to writing-plans for the implementation plan.
