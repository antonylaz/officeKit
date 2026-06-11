import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const variants = await db.productVariant.findMany({
    where: { itemId: id, active: true },
    orderBy: { displayOrder: "asc" },
  });

  // Fetch live prices in a separate query so a stale Prisma client (e.g. dev
  // server that hasn't restarted after a schema migration) can't break variant
  // loading. Silently degrade to no priced offers if the table isn't there.
  let prices: Array<{
    variantId: string;
    retailerId: string;
    priceOre: number;
    stockStatus: string | null;
    affiliateUrl: string;
  }> = [];
  try {
    if (variants.length > 0) {
      prices = await db.variantPrice.findMany({
        where: { variantId: { in: variants.map((v) => v.id) } },
        select: {
          variantId: true,
          retailerId: true,
          priceOre: true,
          stockStatus: true,
          affiliateUrl: true,
        },
      });
    }
  } catch {
    prices = [];
  }

  const pricesByVariant = new Map<string, typeof prices>();
  for (const p of prices) {
    const list = pricesByVariant.get(p.variantId) ?? [];
    list.push(p);
    pricesByVariant.set(p.variantId, list);
  }

  const result = variants.map((v) => ({
    ...v,
    prices: (pricesByVariant.get(v.id) ?? []).map((p) => ({
      retailerId: p.retailerId,
      priceOre: p.priceOre,
      stockStatus: p.stockStatus,
      affiliateUrl: p.affiliateUrl,
    })),
  }));

  return NextResponse.json({ variants: result });
}

export const revalidate = 300;
