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
    // Snapshot the previous status so we only email on actual changes
    const prev = await db.listing.findUnique({ where: { id }, select: { status: true } });
    const listing = await db.listing.update({
      where: { id },
      data: {
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    });

    // Fire-and-forget seller notification on status change
    if (parsed.data.status !== undefined && prev?.status !== listing.status) {
      void (async () => {
        const { notifySellerListingStatus } = await import("@/server/seller-notifications");
        await notifySellerListingStatus(listing.id, listing.status);
      })();
    }

    return NextResponse.json({ id: listing.id, status: listing.status });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
