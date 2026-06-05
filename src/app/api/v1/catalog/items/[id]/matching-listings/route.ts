import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findMatchingListings } from "@/server/matching-listings";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: catalogItemId } = await ctx.params;
  const url = new URL(req.url);
  const city = url.searchParams.get("city") ?? undefined;

  const item = await db.itemCatalog.findUnique({ where: { id: catalogItemId }, select: { id: true, name: true } });
  if (!item) {
    return NextResponse.json({ listings: [] });
  }

  const listings = await findMatchingListings(catalogItemId, item.name, city);
  return NextResponse.json({ listings });
}
