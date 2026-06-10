import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupplier } from "@/lib/supplier-auth";
import { listSupplierTemplates, saveTemplate } from "@/server/quote-templates";

export async function GET() {
  const { supplierId } = await requireSupplier();
  const templates = await listSupplierTemplates(supplierId);
  return NextResponse.json({ templates });
}

const lineSchema = z.object({
  itemId: z.string().min(1),
  mode: z.enum(["new", "used"]),
  unitPrice: z.number().int().min(0).max(100_000_000),
});

const saveSchema = z.object({
  name: z.string().min(1).max(80),
  notes: z.string().max(2000).nullable().optional(),
  perks: z.array(z.string().max(80)).max(20).default([]),
  lines: z.array(lineSchema).min(1).max(200),
});

export async function POST(req: Request) {
  const { supplierId } = await requireSupplier();
  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const template = await saveTemplate({ supplierId, ...parsed.data });
  return NextResponse.json({ template });
}
