/**
 * Run before `vercel deploy --prod` to catch missing/misconfigured env.
 * Exits with code 0 if green, 1 if any required var is missing.
 *
 * Usage:
 *   pnpm deploy:check
 *   AUTH_SECRET=... DATABASE_URL=... pnpm deploy:check
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Best-effort: load .env.production.local then .env.local if either is present,
// so the check works locally before deploy too.
function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvFile(".env.production.local");
loadEnvFile(".env.local");

interface Check {
  name: string;
  status: "ok" | "warn" | "missing";
  detail?: string;
}

const required = [
  { key: "DATABASE_URL", hint: "Postgres URL — Neon / Supabase / RDS / Railway" },
  { key: "AUTH_SECRET", hint: "Run: openssl rand -base64 32" },
  { key: "AUTH_URL", hint: "Production URL, e.g. https://officekit.se" },
  { key: "NEXT_PUBLIC_APP_URL", hint: "Same as AUTH_URL — used in email links" },
];

const recommended = [
  { key: "RESEND_API_KEY", hint: "Magic-link, listing emails, status updates" },
  { key: "RESEND_FROM_EMAIL", hint: 'Verified sender, e.g. "OfficeKit <hello@officekit.se>"' },
  { key: "ANTHROPIC_API_KEY", hint: "Without this the /ai-build route shows 'AI not configured'" },
];

const optional = [
  { key: "CRIIPTO_ISSUER", hint: "Swedish BankID gateway — disable BankID button when unset" },
  { key: "CRIIPTO_CLIENT_ID" },
  { key: "CRIIPTO_CLIENT_SECRET" },
  { key: "STRIPE_SECRET_KEY", hint: "Without this, payments run in stub mode" },
  { key: "STRIPE_WEBHOOK_SECRET" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" },
  { key: "SENTRY_DSN", hint: "Server-side error reporting" },
  { key: "NEXT_PUBLIC_SENTRY_DSN", hint: "Browser-side error reporting" },
  { key: "NEXT_PUBLIC_POSTHOG_KEY", hint: "Funnel analytics" },
  { key: "UPSTASH_REDIS_REST_URL", hint: "Rate limits — falls back to in-memory when unset" },
  { key: "UPSTASH_REDIS_REST_TOKEN" },
];

function check(group: { key: string; hint?: string }[], tier: "required" | "recommended" | "optional"): Check[] {
  return group.map((g) => {
    const v = process.env[g.key];
    if (!v) {
      return {
        name: g.key,
        status: tier === "required" ? "missing" : "warn",
        detail: g.hint ?? "",
      };
    }
    return { name: g.key, status: "ok" };
  });
}

const out: Array<{ tier: string; checks: Check[] }> = [
  { tier: "required", checks: check(required, "required") },
  { tier: "recommended", checks: check(recommended, "recommended") },
  { tier: "optional", checks: check(optional, "optional") },
];

console.log("\nOfficeKit deploy-check\n");
const ICONS = { ok: "✓", warn: "○", missing: "✗" };
let missing = 0;
let warnings = 0;
for (const group of out) {
  console.log(`  ${group.tier}:`);
  for (const c of group.checks) {
    console.log(`    ${ICONS[c.status]} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
    if (c.status === "missing") missing++;
    if (c.status === "warn") warnings++;
  }
}
console.log();
if (missing > 0) {
  console.log(`✗ Cannot deploy: ${missing} required env var${missing === 1 ? "" : "s"} missing.`);
  console.log("  Set them in Vercel → Settings → Environment Variables (Production).");
  process.exit(1);
}
if (warnings > 0) {
  console.log(`○ ${warnings} recommended/optional var${warnings === 1 ? "" : "s"} unset.`);
  console.log("  Deploy will succeed, but the corresponding feature degrades gracefully.");
}
console.log("✓ Ready to deploy.");
process.exit(0);
