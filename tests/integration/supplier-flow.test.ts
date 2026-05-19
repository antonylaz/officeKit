import { describe, expect, it, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as OTPAuth from "otpauth";
import { hashPassword } from "@/lib/password";
import { encryptSecret, generateSecret } from "@/lib/totp";
import { upsertDraft, submitQuote } from "@/server/supplier-quote";
import { listInbox, markViewed } from "@/server/supplier-rfq";
import { getDashboardMetrics } from "@/server/supplier-metrics";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public",
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

let testSupplierId: string;
let testRfqId: string;
let totpSecret: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-32-chars-minimum-padding-1234";

  const supplier = await db.supplier.findFirstOrThrow({ where: { orgNumber: "559000-0001" } });
  testSupplierId = supplier.id;

  totpSecret = generateSecret();
  await db.user.upsert({
    where: { email: "test-integration@officekit.test" },
    create: {
      email: "test-integration@officekit.test",
      role: "supplier",
      supplierId: testSupplierId,
      passwordHash: await hashPassword("integration-test-pw"),
      twoFaSecret: encryptSecret(totpSecret),
      twoFaEnabled: true,
    },
    update: {
      twoFaSecret: encryptSecret(totpSecret),
      twoFaEnabled: true,
      passwordHash: await hashPassword("integration-test-pw"),
      supplierId: testSupplierId,
      role: "supplier",
    },
  });
  const company = await db.company.create({ data: { name: "Integration Test Co " + Date.now() } });
  const project = await db.project.create({
    data: { companyId: company.id, name: "Integration Project", industry: "it", headcount: 5, city: "Stockholm", status: "requesting_quotes" },
  });
  const item = await db.itemCatalog.findFirst();
  if (item) {
    await db.projectItem.create({ data: { projectId: project.id, itemId: item.id, quantity: 5, mode: "new" } });
  }
  const rfq = await db.rfq.upsert({
    where: { projectId_supplierId: { projectId: project.id, supplierId: testSupplierId } },
    create: { projectId: project.id, supplierId: testSupplierId, status: "sent", deadlineAt: new Date(Date.now() + 86400_000) },
    update: { status: "sent", deadlineAt: new Date(Date.now() + 86400_000), viewedAt: null, quotedAt: null, decidedAt: null },
  });
  testRfqId = rfq.id;
});

describe("supplier flow integration", () => {
  it("lists inbox and finds the test RFQ", async () => {
    const { rfqs } = await listInbox(testSupplierId);
    expect(rfqs.some((r) => r.id === testRfqId)).toBe(true);
  });

  it("marks viewed sets viewedAt and status", async () => {
    await markViewed(testRfqId, testSupplierId);
    const rfq = await db.rfq.findUniqueOrThrow({ where: { id: testRfqId } });
    expect(rfq.viewedAt).not.toBeNull();
    expect(rfq.status).toBe("viewed");
  });

  it("upserts a draft quote", async () => {
    const item = await db.itemCatalog.findFirst();
    if (!item) throw new Error("no catalog items seeded");
    const quote = await upsertDraft({
      rfqId: testRfqId,
      supplierId: testSupplierId,
      lines: [{ itemId: item.id, quantity: 5, mode: "new", unitPrice: 500_000 }],
      notes: "test notes",
      perks: ["free delivery"],
    });
    expect(quote.lines).toHaveLength(1);
    expect(quote.submittedAt).toBeNull();
  });

  it("submits the quote and transitions RFQ status to quoted", async () => {
    await submitQuote(testRfqId, testSupplierId);
    const rfq = await db.rfq.findUniqueOrThrow({ where: { id: testRfqId }, include: { quote: true } });
    expect(rfq.status).toBe("quoted");
    expect(rfq.quote?.submittedAt).not.toBeNull();
  });

  it("computes dashboard metrics without errors", async () => {
    const m = await getDashboardMetrics(testSupplierId);
    expect(m).toMatchObject({
      openRfqs: expect.any(Number),
      pipelineValueOre: expect.any(Number),
      avgResponseTimeMs: expect.any(Number),
    });
  });

  it("TOTP code computed from stored secret is valid", () => {
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(totpSecret) });
    expect(totp.generate()).toMatch(/^\d{6}$/);
  });
});
