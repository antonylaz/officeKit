import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupplier } from "@/lib/supplier-auth";
import { upsertDraft, submitQuote } from "@/server/supplier-quote";

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0).max(9999),
  mode: z.enum(["new", "used"]),
  unitPrice: z.number().int().min(0).max(100_000_000),
});

const draftSchema = z.object({
  lines: z.array(lineSchema),
  notes: z.string().max(2000).default(""),
  perks: z.array(z.string().max(80)).max(20).default([]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const body = await req.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const lines = parsed.data.lines.filter((l) => l.quantity > 0);
    const quote = await upsertDraft({ rfqId: id, supplierId, lines, notes: parsed.data.notes, perks: parsed.data.perks });
    return NextResponse.json({ quote });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  try {
    const quote = await submitQuote(id, supplierId);
    return NextResponse.json({ quote });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
