import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { deleteTemplate } from "@/server/quote-templates";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supplierId } = await requireSupplier();
  const { id } = await ctx.params;
  await deleteTemplate(id, supplierId);
  return NextResponse.json({ ok: true });
}
