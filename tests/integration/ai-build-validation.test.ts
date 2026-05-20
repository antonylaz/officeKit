import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateProposal, type Proposal } from "@/server/ai-build-office";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function realProposalScaffold(overrides: Partial<Proposal["items"][number]>[] = []): Promise<Proposal> {
  const items = await db.itemCatalog.findMany({ take: 5 });
  const variants = await db.productVariant.findMany({ take: 1 });

  return {
    projectName: "Test Project",
    industry: "it",
    headcount: 10,
    city: "Stockholm",
    reasoning: "Test",
    items: items.slice(0, 3).map((item, i) => ({
      itemId: item.id,
      variantId: i === 0 && variants[0] ? variants[0].id : null,
      quantity: 5,
      mode: "new" as const,
      rationale: "ok",
      ...overrides[i],
    })),
  };
}

describe("validateProposal", () => {
  it("ok for a proposal with real itemIds and variantIds", async () => {
    // Pick a variant + the item it belongs to
    const variant = await db.productVariant.findFirstOrThrow();
    const proposal: Proposal = {
      projectName: "Real Test",
      industry: "it",
      headcount: 5,
      city: "Stockholm",
      reasoning: "ok",
      items: [
        { itemId: variant.itemId, variantId: variant.id, quantity: 5, mode: "new", rationale: "main" },
        { itemId: "phone-booth", variantId: null, quantity: 1, mode: "new", rationale: "calls" },
        { itemId: "coffee-machine", variantId: null, quantity: 1, mode: "new", rationale: "coffee" },
      ],
    };
    const result = await validateProposal(proposal);
    expect(result.ok).toBe(true);
    expect(result.invalidItemIds).toEqual([]);
    expect(result.invalidVariantIds).toEqual([]);
  });

  it("rejects hallucinated itemId", async () => {
    const proposal = await realProposalScaffold([
      { itemId: "definitely-not-a-real-item" },
    ]);
    const result = await validateProposal(proposal);
    expect(result.ok).toBe(false);
    expect(result.invalidItemIds).toContain("definitely-not-a-real-item");
  });

  it("rejects hallucinated variantId", async () => {
    const proposal = await realProposalScaffold([
      { variantId: "fake-variant-id-xyz" },
    ]);
    const result = await validateProposal(proposal);
    expect(result.ok).toBe(false);
    expect(result.invalidVariantIds).toContain("fake-variant-id-xyz");
  });

  it("rejects variantId that belongs to a different item (mismatch)", async () => {
    // Find a variant that belongs to monitor-27, then attach it to task-chair
    const monitorVariant = await db.productVariant.findFirstOrThrow({ where: { itemId: "monitor-27" } });
    const proposal: Proposal = {
      projectName: "Mismatch Test",
      industry: "it",
      headcount: 5,
      city: "Stockholm",
      reasoning: "test",
      items: [
        { itemId: "task-chair", variantId: monitorVariant.id, quantity: 5, mode: "new", rationale: "mismatch on purpose" },
        { itemId: "desk-electric", variantId: null, quantity: 5, mode: "new", rationale: "ok" },
        { itemId: "phone-booth", variantId: null, quantity: 1, mode: "new", rationale: "ok" },
      ],
    };
    const result = await validateProposal(proposal);
    expect(result.ok).toBe(false);
    expect(result.mismatchedVariantItemIds).toContain(monitorVariant.id);
  });
});
