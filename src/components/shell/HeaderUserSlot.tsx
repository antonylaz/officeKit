import { listMyProjects } from "@/server/my-projects";
import { db } from "@/lib/db";
import { UserMenu } from "./UserMenu";

/**
 * Server slot that resolves identity + counts and renders the client UserMenu.
 * Renders nothing if neither an auth session nor a claim cookie is set.
 */
export async function HeaderUserSlot() {
  const { context, projects } = await listMyProjects();
  if (!context.hasIdentity) return null;

  const projectIds = projects.map((p) => p.id);
  const orderCount = projectIds.length
    ? await db.order.count({ where: { projectId: { in: projectIds } } })
    : 0;

  return (
    <UserMenu
      userEmail={context.userEmail}
      hasIdentity={context.hasIdentity}
      projectCount={projects.length}
      orderCount={orderCount}
    />
  );
}
