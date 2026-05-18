import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

const schema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(9999),
  mode: z.enum(["new", "used"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.projectItem.upsert({
    where: { projectId_itemId: { projectId: id, itemId: parsed.data.itemId } },
    create: { projectId: id, ...parsed.data },
    update: { quantity: parsed.data.quantity, mode: parsed.data.mode },
  });
  const updated = await db.project.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { item: true } } },
  });
  return NextResponse.json({ summary: computeSummary(updated.items), items: updated.items });
}
