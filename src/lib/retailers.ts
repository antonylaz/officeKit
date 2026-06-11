/**
 * Swedish retailer catalog + deep-search URL builders.
 *
 * Each retailer here can be reached two ways:
 *
 * 1. **Deep-search URL** — deterministic search by SKU/manufacturer/name.
 *    Always works, no signup, no rate limits. Used as the baseline so every
 *    variant has somewhere to go even when feeds are not connected.
 *
 * 2. **Priced offer** (via `VariantPrice` table) — populated by the affiliate
 *    sync engine when the publisher account is connected. UI prefers these
 *    because they carry a real price + stock status + affiliate tagging.
 *
 * Retailers are routed by item *category* so we don't show "Buy at Inet"
 * for a sofa or "Buy at IKEA" for a Thunderbolt dock.
 */

import type { ItemCatalog, ProductVariant } from "@prisma/client";

export type RetailerId =
  | "inet"
  | "webhallen"
  | "komplett"
  | "netonnet"
  | "dustin"
  | "elgiganten"
  | "ikea"
  | "kinnarps"
  | "officedepot"
  | "tradera"
  | "blocket";

export interface Retailer {
  id: RetailerId;
  name: string;
  /** Slug → category match (uses ItemCatalog.category strings) */
  categories: ReadonlyArray<string>;
  /** Tag for the UI: which marketplace tier this is in */
  kind: "new" | "used";
  /** Function that turns a query string into a deep-search URL */
  search: (query: string) => string;
  /** Brand accent for the offer card; defaults to ink */
  accent?: string;
}

// Coverage matrix — kept tight on purpose so we don't show silly suggestions.
// "*" means "all categories"; specific arrays are an allow-list.
export const RETAILERS: ReadonlyArray<Retailer> = [
  // Swedish electronics — tech-heavy retailers
  {
    id: "inet",
    name: "Inet",
    categories: ["tech"],
    kind: "new",
    search: (q) => `https://www.inet.se/sok?searchPhrase=${encodeURIComponent(q)}`,
    accent: "#e30613",
  },
  {
    id: "webhallen",
    name: "Webhallen",
    categories: ["tech"],
    kind: "new",
    search: (q) => `https://www.webhallen.com/se/search?query=${encodeURIComponent(q)}`,
    accent: "#e60000",
  },
  {
    id: "komplett",
    name: "Komplett",
    categories: ["tech"],
    kind: "new",
    search: (q) => `https://www.komplett.se/search?q=${encodeURIComponent(q)}`,
    accent: "#0066b3",
  },
  {
    id: "netonnet",
    name: "NetOnNet",
    categories: ["tech", "breakroom"],
    kind: "new",
    search: (q) => `https://www.netonnet.se/Search?searchPhrase=${encodeURIComponent(q)}`,
    accent: "#ffd400",
  },
  {
    id: "dustin",
    name: "Dustin",
    categories: ["tech"],
    kind: "new",
    search: (q) => `https://www.dustin.se/search?query=${encodeURIComponent(q)}`,
    accent: "#003a70",
  },
  {
    id: "elgiganten",
    name: "Elgiganten",
    categories: ["tech", "breakroom"],
    kind: "new",
    search: (q) => `https://www.elgiganten.se/search?query=${encodeURIComponent(q)}`,
    accent: "#0072c6",
  },

  // Furniture & general office
  {
    id: "ikea",
    name: "IKEA",
    categories: ["workstations", "meeting", "storage", "breakroom", "common"],
    kind: "new",
    search: (q) => `https://www.ikea.com/se/sv/search/?q=${encodeURIComponent(q)}`,
    accent: "#0058a3",
  },
  {
    id: "kinnarps",
    name: "Kinnarps",
    categories: ["workstations", "meeting"],
    kind: "new",
    search: (q) => `https://www.kinnarps.se/sok/?q=${encodeURIComponent(q)}`,
    accent: "#0b4f8a",
  },
  {
    id: "officedepot",
    name: "Office Depot",
    categories: ["workstations", "meeting", "storage", "common"],
    kind: "new",
    search: (q) => `https://www.officedepot.se/search?keyword=${encodeURIComponent(q)}`,
    accent: "#cb2027",
  },

  // Second-hand marketplaces
  {
    id: "tradera",
    name: "Tradera",
    categories: ["*"],
    kind: "used",
    search: (q) => `https://www.tradera.com/search?q=${encodeURIComponent(q)}`,
    accent: "#1b3026",
  },
  {
    id: "blocket",
    name: "Blocket",
    categories: ["*"],
    kind: "used",
    search: (q) => `https://www.blocket.se/annonser/hela_sverige?q=${encodeURIComponent(q)}`,
    accent: "#5b8a3a",
  },
] as const;

export interface RetailerOffer {
  retailerId: RetailerId;
  retailerName: string;
  kind: "new" | "used";
  url: string;
  /** True when the URL points to a specific product page rather than a search */
  precise: boolean;
  /** Live price in öre, if a feed has supplied one. null = "search only" */
  priceOre: number | null;
  /** "in_stock" | "out_of_stock" | "preorder" | "unknown" | null */
  stockStatus: string | null;
  accent?: string;
}

/**
 * Best query for deep-searching the variant on a retailer.
 * Manufacturer + SKU is the most reliable when present (Dell U2723QE).
 * Otherwise manufacturer + first 4 words of the name.
 */
export function buildSearchQuery(variant: Pick<ProductVariant, "name" | "manufacturer" | "sku">): string {
  if (variant.sku && variant.sku.length > 2) {
    return `${variant.manufacturer} ${variant.sku}`.trim();
  }
  const namePrefix = variant.name.split(/\s+/).slice(0, 4).join(" ");
  return `${variant.manufacturer} ${namePrefix}`.trim();
}

/**
 * Compose the offer list for one variant.
 *
 * Inputs:
 *   - `variant`: the catalog row
 *   - `item`: parent catalog item (for category routing)
 *   - `pricedOffers`: rows from VariantPrice already keyed by retailerId.
 *      Used to overlay live price/stock/affiliate-URL onto the deep-search
 *      fallback for that retailer.
 *
 * Output: ordered list — priced offers first (cheapest), then search-only.
 */
export function buildVariantOffers(
  variant: ProductVariant,
  item: Pick<ItemCatalog, "category">,
  pricedOffers: ReadonlyArray<{
    retailerId: string;
    priceOre: number;
    stockStatus: string | null;
    affiliateUrl: string;
  }> = [],
): RetailerOffer[] {
  const query = buildSearchQuery(variant);
  const eligible = RETAILERS.filter(
    (r) =>
      r.categories.includes("*") || r.categories.includes(item.category),
  );
  const pricedMap = new Map(pricedOffers.map((p) => [p.retailerId, p]));

  const offers: RetailerOffer[] = eligible.map((r) => {
    const priced = pricedMap.get(r.id);
    if (priced) {
      return {
        retailerId: r.id,
        retailerName: r.name,
        kind: r.kind,
        url: priced.affiliateUrl,
        precise: true,
        priceOre: priced.priceOre,
        stockStatus: priced.stockStatus,
        accent: r.accent,
      };
    }
    return {
      retailerId: r.id,
      retailerName: r.name,
      kind: r.kind,
      url: r.search(query),
      precise: false,
      priceOre: null,
      stockStatus: null,
      accent: r.accent,
    };
  });

  // Sort: priced first (cheapest), then search-only (alphabetical for stability)
  offers.sort((a, b) => {
    if (a.priceOre != null && b.priceOre == null) return -1;
    if (a.priceOre == null && b.priceOre != null) return 1;
    if (a.priceOre != null && b.priceOre != null) return a.priceOre - b.priceOre;
    return a.retailerName.localeCompare(b.retailerName);
  });

  return offers;
}
