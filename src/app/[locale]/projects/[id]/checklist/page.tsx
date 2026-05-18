import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";
import { ChecklistView } from "@/components/checklist/ChecklistView";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const catalog = await db.itemCatalog.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const summary = computeSummary(project.items);
  return <ChecklistView project={project} catalog={catalog} initialSummary={summary} />;
}
