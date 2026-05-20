import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const variants = await db.productVariant.findMany({
    where: { itemId: id, active: true },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json({ variants });
}

export const revalidate = 300;
