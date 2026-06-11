import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { syncAffiliateFeed } from "@/server/affiliate-sync";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public",
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const TEST_FEED_SOURCE = "test_phase22_feed";

describe("phase 22 — affiliate feed sync", () => {
  beforeAll(async () => {
    await db.productVariant.deleteMany({ where: { feedSource: TEST_FEED_SOURCE } });
  });
  afterAll(async () => {
    await db.productVariant.deleteMany({ where: { feedSource: TEST_FEED_SOURCE } });
    await db.$disconnect();
  });

  it("upserts variants from the mock feed and stamps feedSource + lastSyncedAt", async () => {
    const result = await syncAffiliateFeed({
      feedSource: TEST_FEED_SOURCE,
      source: { type: "file", path: "prisma/mock-feeds/tradedoubler-dustin-sample.xml" },
    });
    expect(result.errors).toEqual([]);
    expect(result.parsed).toBe(4);
    expect(result.upserted).toBe(4);

    const dell = await db.productVariant.findUnique({
      where: { id: `${TEST_FEED_SOURCE}-dustin-5010962` },
    });
    expect(dell).not.toBeNull();
    expect(dell!.manufacturer).toBe("Dell");
    expect(dell!.feedSource).toBe(TEST_FEED_SOURCE);
    expect(dell!.affiliateUrl).toContain("tradedoubler");
    expect(dell!.stockStatus).toBe("in_stock");
    expect(dell!.lastSyncedAt).not.toBeNull();
    // 6995 SEK → 699500 öre
    expect(dell!.priceNewOre).toBe(699500);
  });

  it("re-running the sync is idempotent (update, not duplicate)", async () => {
    const first = await syncAffiliateFeed({
      feedSource: TEST_FEED_SOURCE,
      source: { type: "file", path: "prisma/mock-feeds/tradedoubler-dustin-sample.xml" },
    });
    const second = await syncAffiliateFeed({
      feedSource: TEST_FEED_SOURCE,
      source: { type: "file", path: "prisma/mock-feeds/tradedoubler-dustin-sample.xml" },
    });
    expect(first.upserted).toBe(4);
    expect(second.upserted).toBe(4);
    const count = await db.productVariant.count({ where: { feedSource: TEST_FEED_SOURCE } });
    expect(count).toBe(4);
  });

  it("preorder status is normalized correctly", async () => {
    const dock = await db.productVariant.findUnique({
      where: { id: `${TEST_FEED_SOURCE}-dustin-5008832` },
    });
    expect(dock).not.toBeNull();
    expect(dock!.stockStatus).toBe("preorder");
  });
});
