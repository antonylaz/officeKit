import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

const schema = z.object({
  status: z.enum(["confirmed", "in_production", "shipped", "delivered", "paid", "cancelled"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await db.order.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ order: updated });
}
