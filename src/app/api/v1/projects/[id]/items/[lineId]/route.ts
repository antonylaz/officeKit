import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

const patchSchema = z.object({
  quantity: z.number().int().min(0).max(9999).optional(),
  mode: z.enum(["new", "used"]).optional(),
  variantId: z.string().uuid().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.quantity === 0) {
    await db.projectItem.delete({ where: { id: lineId } });
  } else {
    await db.projectItem.update({ where: { id: lineId }, data: parsed.data });
  }

  const updated = await db.project.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { item: true, variant: true } } },
  });
  return NextResponse.json({ summary: computeSummary(updated.items), items: updated.items });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.projectItem.delete({ where: { id: lineId } });
  const updated = await db.project.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { item: true, variant: true } } },
  });
  return NextResponse.json({ summary: computeSummary(updated.items), items: updated.items });
}
