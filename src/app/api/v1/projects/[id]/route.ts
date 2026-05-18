import { NextResponse } from "next/server";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found_or_unauthorized" }, { status: 404 });
  const summary = computeSummary(project.items);
  return NextResponse.json({ project, summary });
}
