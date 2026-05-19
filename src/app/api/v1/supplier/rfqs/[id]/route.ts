import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { getRfqDetail, markViewed } from "@/server/supplier-rfq";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  await markViewed(id, supplierId);
  const rfq = await getRfqDetail(id, supplierId);
  if (!rfq) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const competitorCount = await db.rfq.count({ where: { projectId: rfq.projectId, NOT: { id: rfq.id } } });
  return NextResponse.json({ rfq, competitorCount });
}

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const ok = await markViewed(id, supplierId);
  return NextResponse.json({ ok });
}
