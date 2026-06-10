import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupplier } from "@/lib/supplier-auth";
import { applyTemplateToDraft } from "@/server/quote-templates";

const schema = z.object({ templateId: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supplierId } = await requireSupplier();
  const { id: rfqId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const result = await applyTemplateToDraft(parsed.data.templateId, rfqId, supplierId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = (e as Error).message;
    const status = message === "template_not_found" || message === "rfq_not_found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
