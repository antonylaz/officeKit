import { NextResponse } from "next/server";
import { getAuthorizedProject } from "@/server/projects";
import { listQuotesForProject } from "@/server/quotes-listing";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_authorized" }, { status: 404 });
  const result = await listQuotesForProject(id);
  return NextResponse.json(result);
}
