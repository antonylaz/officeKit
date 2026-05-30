import { db } from "@/lib/db";
import type { ItemCondition } from "@prisma/client";

export interface MatchingListing {
  listingId: string;
  city: string;
  reason: string;
  moveOutDate: Date | null;
  // Per-item match:
  description: string;
  quantity: number;
  condition: ItemCondition;
  askingPriceOre: number | null;
}

/**
 * Find approved/listed resale entries matching a catalog item.
 *
 * Match by:
 *   1. exact catalogItemId — strongest signal (seller picked the same SKU)
 *   2. fuzzy text match on description containing the item name — fallback
 *
 * Optionally biased toward the buyer's city (returned first), but cross-city
 * matches are still included since transport is cheap relative to the savings.
 */
// Generic stop-words and adjective tokens that don't carry product identity.
const STOP_TOKENS = new Set([
  "the", "and", "or", "for", "with", "of", "in", "to", "a", "an",
  "standard", "compact", "small", "large", "premium", "budget", "mid", "tier",
  "office", "personal", "general", "default",
  "new", "used", "set", "unit", "units",
  "inch", "inches",
]);

function significantTokens(s: string): string[] {
  return s
    .toLowerCase()
    // Split on whitespace + most punctuation but preserve hyphens (sit-stand) and digits
    .split(/[^a-z0-9-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOP_TOKENS.has(t));
}

// Hyphenated tokens that are tier/modifier markers, not product identifiers.
// Examples: "mid-tier ergonomic task chair", "phone booth, single-person",
// "meeting table, 6-person", "personal locker (8-compartment)"
const MODIFIER_HYPHEN_RE = /^(mid|low|high|single|double|triple)-\w+$/;
const MODIFIER_SIZE_SUFFIX_RE = /^\d+-(tier|person|compartment|seater)$/;

function isModifierHyphenated(token: string): boolean {
  return MODIFIER_HYPHEN_RE.test(token) || MODIFIER_SIZE_SUFFIX_RE.test(token);
}

/**
 * Build "must-contain" phrases from an item name with collision-avoidance.
 *
 * Rule:
 *   1. Drop modifier-hyphen tokens ("mid-tier", "6-person", "8-compartment") — these
 *      are tier/size markers, not product identity.
 *   2. If real hyphenated identifiers remain (e.g. "sit-stand", "Bean-to-cup", "27-inch"),
 *      use ONLY those. Also add a space-separated variant so "sit stand" matches.
 *   3. Otherwise require ALL non-hyphenated significant tokens to match (AND).
 *      Prevents "Dell 4K monitor" cross-matching with "Single monitor arm".
 */
function buildMatchTerms(itemName: string): { mode: "any" | "all"; terms: string[] } {
  const tokens = significantTokens(itemName).filter((t) => !isModifierHyphenated(t));
  const hyphenated = tokens.filter((t) => t.includes("-"));
  if (hyphenated.length > 0) {
    const expanded = hyphenated.flatMap((t) => [t, t.replace(/-/g, " ")]);
    return { mode: "any", terms: expanded };
  }
  return { mode: "all", terms: tokens };
}

export async function findMatchingListings(
  catalogItemId: string,
  itemName: string,
  buyerCity?: string,
): Promise<MatchingListing[]> {
  // Strongest signal: explicit catalogItemId
  const byCatalog = await db.listingItem.findMany({
    where: {
      catalogItemId,
      listing: { status: { in: ["approved", "listed"] } },
    },
    include: { listing: { select: { id: true, city: true, reason: true, moveOutDate: true } } },
    take: 8,
  });

  // Fallback: phrase match on description. Hyphenated terms use OR (any match);
  // generic tokens use AND (all must match) to avoid cross-item collisions.
  const { mode, terms } = buildMatchTerms(itemName);
  const containsClauses = terms.map((tok) => ({
    description: { contains: tok, mode: "insensitive" as const },
  }));
  const byTokens = terms.length === 0
    ? []
    : await db.listingItem.findMany({
        where: {
          AND: [
            { catalogItemId: null },
            mode === "any" ? { OR: containsClauses } : { AND: containsClauses },
            { listing: { status: { in: ["approved", "listed"] } } },
          ],
        },
        include: { listing: { select: { id: true, city: true, reason: true, moveOutDate: true } } },
        take: 8,
      });

  // Merge, dedupe by listingItem.id, cap at 5
  const seen = new Set<string>();
  const rows = [...byCatalog, ...byTokens].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, 5);

  const matches = rows.map((r) => ({
    listingId: r.listing.id,
    city: r.listing.city,
    reason: r.listing.reason,
    moveOutDate: r.listing.moveOutDate,
    description: r.description,
    quantity: r.quantity,
    condition: r.condition,
    askingPriceOre: r.askingPriceOre,
  }));

  // Sort: buyer's city first, then by quantity (more units = better match)
  if (buyerCity) {
    matches.sort((a, b) => {
      const aLocal = a.city.toLowerCase() === buyerCity.toLowerCase();
      const bLocal = b.city.toLowerCase() === buyerCity.toLowerCase();
      if (aLocal !== bLocal) return aLocal ? -1 : 1;
      return b.quantity - a.quantity;
    });
  }

  return matches;
}
