import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { getSupplierOrder } from "@/server/supplier-orders";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const order = await getSupplierOrder(id, supplierId);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order });
}
