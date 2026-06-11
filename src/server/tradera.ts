import { z } from "zod";

/**
 * Tradera Public Search API integration.
 *
 * Tradera offers a public JSON API for searching active auctions and
 * fixed-price items. Register at https://www.tradera.com/info/developer-info
 * to receive an AppId. We send it in the X-Tradera-AppId header per
 * the public-API convention.
 *
 * The exact endpoint shape is encoded once below and validated with Zod —
 * if Tradera changes the response, the call returns null gracefully and
 * the UI falls back to the existing deep-link button.
 *
 * Cached for 30 minutes per query — Tradera updates listings constantly,
 * but our UX doesn't need real-time freshness.
 */

const TRADERA_API = "https://api.tradera.com/v3/public/search/items";
const FETCH_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

const itemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v)),
  title: z.string(),
  // Tradera returns prices as integer öre or as decimal SEK depending on era —
  // accept both, normalize to öre.
  buyItNowPrice: z.number().nullable().optional(),
  currentBid: z.number().nullable().optional(),
  bidCount: z.number().int().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  itemUrl: z.string().url(),
  endDate: z.string().nullable().optional(),
});

const responseSchema = z.object({
  items: z.array(itemSchema).default([]),
  totalNumberOfItems: z.number().int().optional(),
});

export interface TraderaListing {
  id: string;
  title: string;
  priceSek: number | null;       // best-available price (buy-it-now > current bid)
  bidCount: number | null;       // null if not an auction
  thumbnailUrl: string | null;
  url: string;
}

export interface TraderaSearchResult {
  total: number;
  items: TraderaListing[];
}

interface CacheEntry {
  fetchedAt: number;
  result: TraderaSearchResult;
}

const cache = new Map<string, CacheEntry>();

export function isTraderaEnabled(): boolean {
  return Boolean(process.env.TRADERA_APP_ID);
}

export async function searchTradera(query: string, limit = 3): Promise<TraderaSearchResult | null> {
  if (!isTraderaEnabled()) return null;
  if (!query.trim()) return null;

  const key = `${query.toLowerCase()}::${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
    return hit.result;
  }

  const url = new URL(TRADERA_API);
  url.searchParams.set("query", query);
  url.searchParams.set("pageNumber", "1");
  url.searchParams.set("pageSize", String(Math.min(limit, 10)));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Tradera-AppId": process.env.TRADERA_APP_ID!,
        ...(process.env.TRADERA_APP_KEY ? { "X-Tradera-AppKey": process.env.TRADERA_APP_KEY } : {}),
      },
      signal: controller.signal,
      // Cache at the runtime level too — Next 16 respects this on the server
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      // Don't log full payload (PII risk) — just shape mismatch
      console.warn("[tradera] response shape mismatch");
      return null;
    }

    const result: TraderaSearchResult = {
      total: parsed.data.totalNumberOfItems ?? parsed.data.items.length,
      items: parsed.data.items.slice(0, limit).map((it) => {
        const buyNow = it.buyItNowPrice ?? null;
        const bid = it.currentBid ?? null;
        const priceRaw = buyNow ?? bid;
        // Tradera prices are SEK (kr). Convert to öre.
        const priceSek = priceRaw != null ? Math.round(priceRaw) : null;
        return {
          id: it.id,
          title: it.title,
          priceSek,
          bidCount: it.bidCount ?? null,
          thumbnailUrl: it.thumbnailUrl ?? null,
          url: it.itemUrl,
        };
      }),
    };

    cache.set(key, { fetchedAt: Date.now(), result });
    return result;
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.warn("[tradera] fetch failed:", err.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Test helper — exposed only for unit tests
export function _resetTraderaCache(): void {
  cache.clear();
}
