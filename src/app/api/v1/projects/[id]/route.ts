import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

const patchSchema = z.object({
  floorPlanData: z.unknown().optional(),
  status: z.enum(["draft", "requesting_quotes", "quotes_received", "ordered", "closed"]).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found_or_unauthorized" }, { status: 404 });
  const summary = computeSummary(project.items);
  return NextResponse.json({ project, summary });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.project.update({
    where: { id },
    data: {
      floorPlanData: parsed.data.floorPlanData === undefined ? undefined : (parsed.data.floorPlanData as never),
      status: parsed.data.status,
    },
  });
  return NextResponse.json({ ok: true });
}
