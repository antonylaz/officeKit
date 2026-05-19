import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupplier } from "@/lib/supplier-auth";
import { transitionOrderStatus } from "@/server/supplier-orders";

const schema = z.object({
  status: z.enum(["in_production", "shipped", "delivered"]),
  trackingNumber: z.string().max(100).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const order = await transitionOrderStatus(id, supplierId, parsed.data.status, parsed.data.trackingNumber);
    return NextResponse.json({ order });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
