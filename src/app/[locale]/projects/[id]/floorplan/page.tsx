import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { FloorPlanView } from "@/components/floorplan/FloorPlanView";

export default async function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  return <FloorPlanView project={project} />;
}
