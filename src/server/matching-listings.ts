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

  // Fallback: per-token OR across the description
  const tokens = significantTokens(itemName);
  const byTokens = tokens.length === 0
    ? []
    : await db.listingItem.findMany({
        where: {
          AND: [
            { catalogItemId: null },
            {
              OR: tokens.map((tok) => ({
                description: { contains: tok, mode: "insensitive" as const },
              })),
            },
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
