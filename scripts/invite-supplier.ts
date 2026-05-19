import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

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
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Resend } from "resend";
import { SupplierInviteEmail } from "@/emails/SupplierInvite";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

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
  const role = (args.role as "supplier" | "admin" | undefined) ?? "supplier";

  if (!email) {
    console.error("Usage: pnpm tsx scripts/invite-supplier.ts --email <addr> [--supplier-id <uuid>] [--role supplier|admin] [--name <name>]");
    process.exit(1);
  }

  if (role === "supplier" && !supplierId) {
    console.error("--supplier-id required for role=supplier");
    process.exit(1);
  }

  const supplier = role === "supplier"
    ? await db.supplier.findUnique({ where: { id: supplierId! } })
    : null;
  if (role === "supplier" && !supplier) {
    console.error(`Supplier ${supplierId} not found`);
    process.exit(1);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.user.upsert({
    where: { email },
    create: { email, name, role, supplierId: role === "supplier" ? supplierId : null, onboardingToken: token, onboardingExpiresAt: expiresAt },
    update: { name, role, supplierId: role === "supplier" ? supplierId : null, onboardingToken: token, onboardingExpiresAt: expiresAt },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sv/supplier/onboarding/${token}`;
  console.log(`\nOnboarding link (also emailed to ${email}):\n${url}\n`);

  const inviteName = supplier?.name ?? "OfficeKit Admin";

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (apiKey && from && !apiKey.startsWith("re_xxx")) {
    const resend = new Resend(apiKey);
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: "Aktivera ditt OfficeKit-konto",
        react: SupplierInviteEmail({ url, supplierName: inviteName, locale: "sv" }),
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
