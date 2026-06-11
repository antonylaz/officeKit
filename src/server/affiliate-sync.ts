/**
 * Sync a Tradedoubler-style product feed into ProductVariant.
 *
 * Tradedoubler product feeds are XML (or CSV) URLs you get when you sign up
 * as a publisher and apply to an advertiser. Each daily feed contains every
 * available SKU with price, stock, image URL, and an affiliate-tagged deep link.
 *
 * Real-world feeds from Dustin / Komplett / Inet / NetOnNet have ~5–20k rows
 * each. We upsert by (feedSource, sourceFeedId).
 *
 * To run with the dev mock: pnpm tsx scripts/sync-affiliate-feeds.ts
 * To run against a real feed (after Tradedoubler signup):
 *   AFFILIATE_FEED_URL=https://... AFFILIATE_FEED_SOURCE=tradedoubler_dustin \
 *     pnpm tsx scripts/sync-affiliate-feeds.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { db } from "@/lib/db";

const productSchema = z.object({
  productId: z.union([z.string(), z.number()]).transform((v) => String(v)),
  productName: z.string(),
  description: z.string().optional(),
  brand: z.string(),
  sku: z.string().optional(),
  category: z.string().optional(),
  price: z
    .union([
      // Tradedoubler nests as { "@_currency": "SEK", "#text": "6995.00" }
      z.object({ "#text": z.union([z.string(), z.number()]) }).transform((v) => Number(v["#text"])),
      z.number(),
      z.string().transform(Number),
    ])
    .refine((n) => !Number.isNaN(n) && n >= 0, "invalid price"),
  stockStatus: z.string().optional(),
  imageUrl: z.string().url(),
  productUrl: z.string().url(),
  /** Optional bridge: the OfficeKit catalog item this product maps to.
   *  Some feeds will include this; otherwise the sync skips the row. */
  officekitItemId: z.string().optional(),
});

const feedSchema = z.object({
  products: z.object({
    product: z.array(productSchema).or(productSchema.transform((p) => [p])),
  }),
});

export interface SyncOptions {
  /** Identifier for the feed: "tradedoubler_dustin", "awin_komplett", etc. */
  feedSource: string;
  /**
   * Which retailer this feed advertises. Matches a RetailerId from
   * src/lib/retailers.ts (e.g. "dustin", "komplett", "inet"). If omitted,
   * the engine derives it from `feedSource` by taking the segment after the
   * first underscore — so "tradedoubler_dustin" → "dustin".
   */
  retailerId?: string;
  /** Either an absolute URL or a local file path (used for dev / tests) */
  source: { type: "url"; url: string } | { type: "file"; path: string };
}

export interface SyncResult {
  parsed: number;
  upserted: number;
  skipped: number;
  errors: string[];
}

export async function syncAffiliateFeed(opts: SyncOptions): Promise<SyncResult> {
  const xml = await readFeed(opts.source);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  const raw: unknown = parser.parse(xml);
  const feed = feedSchema.safeParse(raw);
  if (!feed.success) {
    return {
      parsed: 0,
      upserted: 0,
      skipped: 0,
      errors: ["feed-shape-mismatch: " + feed.error.message.slice(0, 200)],
    };
  }

  const products = feed.data.products.product;
  const errors: string[] = [];
  let upserted = 0;
  let skipped = 0;

  for (const p of products) {
    if (!p.officekitItemId) {
      skipped++;
      continue;
    }
    const catalog = await db.itemCatalog.findUnique({ where: { id: p.officekitItemId } });
    if (!catalog) {
      skipped++;
      errors.push(`unknown catalog id: ${p.officekitItemId}`);
      continue;
    }

    // Derive a deterministic variant id from the feed (so re-runs upsert)
    const variantId = `${opts.feedSource}-${p.productId}`;
    const priceNewOre = Math.round(p.price * 100);
    const retailerId =
      opts.retailerId ??
      // tradedoubler_dustin → dustin · tradedoubler_dustin_mock → dustin
      opts.feedSource.split("_")[1] ??
      opts.feedSource;

    try {
      await db.productVariant.upsert({
        where: { id: variantId },
        create: {
          id: variantId,
          itemId: p.officekitItemId,
          name: p.productName,
          manufacturer: p.brand,
          sku: p.sku ?? null,
          imageUrl: p.imageUrl,
          specs: p.description ? { description: p.description } : {},
          priceNewOre,
          manufacturerUrl: null,
          // Keep blocket/tradera deep-link search queries on existing rows; if new, leave blank
          sourceFeedId: p.productId,
          feedSource: opts.feedSource,
          affiliateUrl: p.productUrl,
          stockStatus: normalizeStock(p.stockStatus),
          lastSyncedAt: new Date(),
          // displayOrder: sort feed-sourced variants after manually-curated ones
          displayOrder: 100,
        },
        update: {
          name: p.productName,
          manufacturer: p.brand,
          sku: p.sku ?? null,
          imageUrl: p.imageUrl,
          specs: p.description ? { description: p.description } : {},
          priceNewOre,
          affiliateUrl: p.productUrl,
          stockStatus: normalizeStock(p.stockStatus),
          lastSyncedAt: new Date(),
          active: true,
        },
      });

      // Engine bit: also write a per-(variant, retailer) price row so the UI
      // can show multiple retailers per variant once more feeds are connected.
      await db.variantPrice.upsert({
        where: { variantId_retailerId: { variantId, retailerId } },
        create: {
          variantId,
          retailerId,
          priceOre: priceNewOre,
          stockStatus: normalizeStock(p.stockStatus),
          affiliateUrl: p.productUrl,
          sourceFeed: opts.feedSource,
        },
        update: {
          priceOre: priceNewOre,
          stockStatus: normalizeStock(p.stockStatus),
          affiliateUrl: p.productUrl,
          sourceFeed: opts.feedSource,
          lastSeenAt: new Date(),
        },
      });

      upserted++;
    } catch (e) {
      errors.push(`upsert failed for ${variantId}: ${(e as Error).message}`);
    }
  }

  return { parsed: products.length, upserted, skipped, errors };
}

async function readFeed(source: SyncOptions["source"]): Promise<string> {
  if (source.type === "file") {
    return readFileSync(resolve(source.path), "utf8");
  }
  const res = await fetch(source.url, { headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`feed fetch ${res.status}`);
  return res.text();
}

function normalizeStock(raw: string | undefined): string {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("in_stock") || lower.includes("in stock") || lower === "true") return "in_stock";
  if (lower.includes("out_of_stock") || lower.includes("out of stock")) return "out_of_stock";
  if (lower.includes("preorder")) return "preorder";
  return "unknown";
}
