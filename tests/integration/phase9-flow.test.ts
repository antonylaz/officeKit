import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { groupItemsBySubcategory } from "@/lib/group-items";
import { SUBCATEGORY_KEYS } from "@/lib/catalog-types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

describe("phase 9 integration", () => {
  it("monitors subcategory has at least 5 items (the 4 new + monitor-27)", async () => {
    const items = await db.itemCatalog.findMany({ where: { subcategory: "monitors" } });
    expect(items.length).toBeGreaterThanOrEqual(5);
    const ids = items.map((i) => i.id).sort();
    expect(ids).toContain("monitor-24");
    expect(ids).toContain("monitor-27");
    expect(ids).toContain("monitor-32");
    expect(ids).toContain("monitor-ultrawide");
    expect(ids).toContain("monitor-curved-32");
  });

  it("chairs subcategory has at least 3 items (task-chair-budget, task-chair, task-chair-premium)", async () => {
    const items = await db.itemCatalog.findMany({ where: { subcategory: "chairs" } });
    expect(items.length).toBeGreaterThanOrEqual(3);
    const ids = items.map((i) => i.id).sort();
    expect(ids).toContain("task-chair-budget");
    expect(ids).toContain("task-chair");
    expect(ids).toContain("task-chair-premium");
  });

  it("every seeded subcategory string is in the typed union (no typos)", async () => {
    const items = await db.itemCatalog.findMany({
      where: { subcategory: { not: null } },
      select: { id: true, subcategory: true },
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect((SUBCATEGORY_KEYS as readonly string[]).includes(item.subcategory!)).toBe(true);
    }
  });

  it("groupItemsBySubcategory orders monitor-27 between monitor-24 and monitor-32 by rank", async () => {
    const items = await db.itemCatalog.findMany({ where: { subcategory: "monitors" } });
    const result = groupItemsBySubcategory(items);
    const monitorGroup = result.groups.find((g) => g.key === "monitors");
    expect(monitorGroup).toBeDefined();
    const ids = monitorGroup!.items.map((i) => i.id);
    const i24 = ids.indexOf("monitor-24");
    const i27 = ids.indexOf("monitor-27");
    const i32 = ids.indexOf("monitor-32");
    expect(i24).toBeLessThan(i27);
    expect(i27).toBeLessThan(i32);
  });

  it("each new item has at least 1 variant seeded", async () => {
    const newItemIds = [
      "monitor-24", "monitor-32", "monitor-ultrawide", "monitor-curved-32",
      "task-chair-budget", "task-chair-premium",
      "desk-small", "desk-large", "desk-l-shape",
      "headset-wired", "headset-noise-cancel",
      "storage-cabinet", "storage-shelving",
    ];
    for (const itemId of newItemIds) {
      const variantCount = await db.productVariant.count({ where: { itemId } });
      expect(variantCount, `${itemId} should have ≥1 variant`).toBeGreaterThanOrEqual(1);
    }
  });

  it("existing project_items rows are unaffected by Phase 9 (no orphans)", async () => {
    // A few existing IDs were relabeled but kept their ID — make sure they still exist
    const surviving = await db.itemCatalog.findMany({
      where: { id: { in: ["task-chair", "desk-electric", "headset", "monitor-27", "locker-8"] } },
      select: { id: true, subcategory: true },
    });
    expect(surviving.map((s) => s.id).sort()).toEqual(["desk-electric", "headset", "locker-8", "monitor-27", "task-chair"]);
    // And each now has a subcategory assigned
    for (const s of surviving) {
      expect(s.subcategory).not.toBeNull();
    }
  });
});
