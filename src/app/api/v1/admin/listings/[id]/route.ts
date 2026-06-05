import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  status: z.enum(["submitted", "reviewing", "approved", "listed", "sold", "withdrawn"]).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const listing = await db.listing.update({
      where: { id },
      data: {
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    });
    return NextResponse.json({ id: listing.id, status: listing.status });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
