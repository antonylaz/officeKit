import { describe, expect, it } from "vitest";
import { buildVariantOffers, buildSearchQuery, RETAILERS } from "@/lib/retailers";
import type { ProductVariant } from "@prisma/client";

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "test-variant",
    itemId: "monitor-27",
    name: "UltraSharp U2723QE 27\" 4K",
    manufacturer: "Dell",
    sku: "U2723QE",
    imageUrl: "/variants/_placeholder.svg",
    specs: {},
    priceNewOre: 699500,
    priceUsedDefaultOre: 300000,
    manufacturerUrl: "https://www.dell.com",
    blocketSearchQuery: "Dell U2723QE",
    traderaSearchQuery: "Dell U2723QE",
    displayOrder: 0,
    active: true,
    sourceFeedId: null,
    feedSource: null,
    affiliateUrl: null,
    stockStatus: null,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProductVariant;
}

describe("retailer offers engine", () => {
  it("buildSearchQuery prefers manufacturer + SKU when SKU is real", () => {
    expect(buildSearchQuery({ manufacturer: "Dell", sku: "U2723QE", name: "Dell U2723QE 27\"" })).toBe(
      "Dell U2723QE",
    );
  });

  it("buildSearchQuery falls back to name when SKU is missing", () => {
    expect(
      buildSearchQuery({ manufacturer: "IKEA", sku: null, name: "Järvfjället kontorsstol svart" }),
    ).toBe("IKEA Järvfjället kontorsstol svart");
  });

  it("routes tech items to electronics retailers, not IKEA", () => {
    const offers = buildVariantOffers(makeVariant(), { category: "tech" });
    const newRetailers = offers.filter((o) => o.kind === "new").map((o) => o.retailerId);
    expect(newRetailers).toContain("inet");
    expect(newRetailers).toContain("webhallen");
    expect(newRetailers).toContain("komplett");
    expect(newRetailers).toContain("dustin");
    expect(newRetailers).not.toContain("ikea");
    expect(newRetailers).not.toContain("kinnarps");
  });

  it("routes workstations to furniture retailers, not Webhallen", () => {
    const offers = buildVariantOffers(
      makeVariant({ id: "v", manufacturer: "IKEA", sku: "JARV" }),
      { category: "workstations" },
    );
    const newRetailers = offers.filter((o) => o.kind === "new").map((o) => o.retailerId);
    expect(newRetailers).toContain("ikea");
    expect(newRetailers).toContain("kinnarps");
    expect(newRetailers).not.toContain("inet");
    expect(newRetailers).not.toContain("webhallen");
  });

  it("always includes Tradera + Blocket under second-hand", () => {
    const tech = buildVariantOffers(makeVariant(), { category: "tech" });
    const furniture = buildVariantOffers(makeVariant(), { category: "workstations" });
    for (const set of [tech, furniture]) {
      const used = set.filter((o) => o.kind === "used").map((o) => o.retailerId);
      expect(used).toContain("tradera");
      expect(used).toContain("blocket");
    }
  });

  it("priced offers sort cheapest-first; search-only follow alphabetically", () => {
    const priced = [
      { retailerId: "komplett", priceOre: 599500, stockStatus: "in_stock", affiliateUrl: "https://komplett.se/u2723" },
      { retailerId: "dustin", priceOre: 549500, stockStatus: "in_stock", affiliateUrl: "https://dustin.se/u2723" },
    ];
    const offers = buildVariantOffers(makeVariant(), { category: "tech" }, priced);
    const newOffers = offers.filter((o) => o.kind === "new");
    expect(newOffers[0]!.retailerId).toBe("dustin"); // cheapest
    expect(newOffers[0]!.priceOre).toBe(549500);
    expect(newOffers[1]!.retailerId).toBe("komplett");
    expect(newOffers[1]!.priceOre).toBe(599500);
    // The third is the first search-only retailer alphabetically
    expect(newOffers[2]!.priceOre).toBeNull();
  });

  it("priced offers carry the affiliate-tagged URL, not the search URL", () => {
    const priced = [
      {
        retailerId: "dustin",
        priceOre: 549500,
        stockStatus: "in_stock",
        affiliateUrl: "https://dustin.se/product/5010962?tduid=officekit",
      },
    ];
    const offers = buildVariantOffers(makeVariant(), { category: "tech" }, priced);
    const dustin = offers.find((o) => o.retailerId === "dustin");
    expect(dustin?.url).toBe("https://dustin.se/product/5010962?tduid=officekit");
    expect(dustin?.precise).toBe(true);
  });

  it("RETAILERS list has at least one furniture and one electronics retailer", () => {
    const tech = RETAILERS.filter((r) => r.kind === "new" && r.categories.includes("tech"));
    const furniture = RETAILERS.filter((r) => r.kind === "new" && r.categories.includes("workstations"));
    expect(tech.length).toBeGreaterThanOrEqual(4);
    expect(furniture.length).toBeGreaterThanOrEqual(2);
  });
});
