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
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

function args() {
  const out: Record<string, string> = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.startsWith("--")) { out[a[i]!.slice(2)] = a[i + 1] ?? ""; i++; }
  }
  return out;
}

async function main() {
  const parsed = args();
  const projectId = parsed["project-id"];
  const winningRfqId = parsed["winning-rfq-id"];
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
