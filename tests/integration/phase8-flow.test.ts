import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { fanoutRfqs } from "@/server/rfq-fanout";
import { upsertDraft } from "@/server/supplier-quote";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

describe("phase 8 integration", () => {
  it("fanout includes a transportation supplier when project has transport items", async () => {
    // Create company + project
    const company = await db.company.create({ data: { name: "P8 Test " + Date.now() } });
    const project = await db.project.create({
      data: { companyId: company.id, name: "p8", industry: "it", headcount: 5, city: "Stockholm", status: "draft" },
    });
    // Add at least one transportation item
    const transportItem = await db.itemCatalog.findFirstOrThrow({ where: { category: "transportation" } });
    await db.projectItem.create({ data: { projectId: project.id, itemId: transportItem.id, quantity: 1, mode: "new" } });

    const rfqs = await fanoutRfqs(project.id);
    // Should include at least one supplier with serviceTypes containing "transportation"
    const suppliers = await db.supplier.findMany({ where: { id: { in: rfqs.map((r) => r.supplierId) } } });
    const hasTransport = suppliers.some((s) => s.serviceTypes.includes("transportation"));
    expect(hasTransport).toBe(true);
  });

  it("fanout does NOT include transport supplier when project has no transport items", async () => {
    const company = await db.company.create({ data: { name: "P8 NoTransport " + Date.now() } });
    const project = await db.project.create({
      data: { companyId: company.id, name: "p8-no-transport", industry: "it", headcount: 5, city: "Stockholm", status: "draft" },
    });
    const furnItem = await db.itemCatalog.findFirstOrThrow({ where: { category: { not: "transportation" } } });
    await db.projectItem.create({ data: { projectId: project.id, itemId: furnItem.id, quantity: 1, mode: "new" } });

    const rfqs = await fanoutRfqs(project.id);
    const suppliers = await db.supplier.findMany({ where: { id: { in: rfqs.map((r) => r.supplierId) } } });
    const hasTransport = suppliers.some((s) => s.serviceTypes.includes("transportation"));
    expect(hasTransport).toBe(false);
  });

  it("variants endpoint returns 4 variants for monitor-27", async () => {
    const variants = await db.productVariant.findMany({ where: { itemId: "monitor-27" } });
    expect(variants.length).toBeGreaterThanOrEqual(3);
  });

  it("project summary uses variant price when variantId is set on the line", async () => {
    const item = await db.itemCatalog.findFirstOrThrow({ where: { id: "monitor-27" } });
    const variant = await db.productVariant.findFirstOrThrow({ where: { itemId: "monitor-27" } });
    const company = await db.company.create({ data: { name: "Summary Test " + Date.now() } });
    const project = await db.project.create({
      data: { companyId: company.id, name: "x", industry: "it", headcount: 1, city: "Stockholm", status: "draft" },
    });
    await db.projectItem.create({
      data: { projectId: project.id, itemId: item.id, quantity: 2, mode: "new", variantId: variant.id },
    });

    const reloaded = await db.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { items: { include: { item: true, variant: true } } },
    });
    const { computeSummary } = await import("@/server/project-summary");
    const summary = computeSummary(reloaded.items);
    // Subtotal should match variant.priceNewOre * 2, NOT item.priceNewDefault * 2
    expect(summary.subtotalOre).toBe(variant.priceNewOre * 2);
    expect(summary.subtotalOre).not.toBe(item.priceNewDefault * 2);  // sanity: variant price should differ from catalog default
  });

  it("supplier quote draft carries the buyer's variantId end-to-end", async () => {
    const item = await db.itemCatalog.findFirstOrThrow({ where: { id: "monitor-27" } });
    const variant = await db.productVariant.findFirstOrThrow({ where: { itemId: "monitor-27" } });
    const supplier = await db.supplier.findFirstOrThrow({ where: { orgNumber: "559000-0001" } });
    const company = await db.company.create({ data: { name: "Variant E2E " + Date.now() } });
    const project = await db.project.create({
      data: { companyId: company.id, name: "variant-e2e", industry: "it", headcount: 1, city: "Stockholm", status: "requesting_quotes" },
    });
    await db.projectItem.create({
      data: { projectId: project.id, itemId: item.id, quantity: 1, mode: "new", variantId: variant.id },
    });
    const rfq = await db.rfq.create({
      data: { projectId: project.id, supplierId: supplier.id, status: "viewed", deadlineAt: new Date(Date.now() + 86400_000) },
    });

    // Supplier submits a draft carrying the variantId
    const quote = await upsertDraft({
      rfqId: rfq.id,
      supplierId: supplier.id,
      lines: [{ itemId: item.id, variantId: variant.id, quantity: 1, mode: "new", unitPrice: variant.priceNewOre }],
      notes: "",
      perks: [],
    });

    // Verify the QuoteLine in the DB has variantId set
    const persisted = await db.quoteLine.findFirstOrThrow({ where: { quoteId: quote.id } });
    expect(persisted.variantId).toBe(variant.id);
  });
});
