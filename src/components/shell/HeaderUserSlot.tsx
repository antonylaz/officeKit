import { listMyProjects } from "@/server/my-projects";
import { db } from "@/lib/db";
import { UserMenu } from "./UserMenu";
import { SignInLink } from "./SignInLink";

/**
 * Server slot that resolves identity + counts and renders either the user menu
 * (when an auth session or claim cookie is set) or a "Sign in" CTA.
 */
export async function HeaderUserSlot() {
  const { context, projects } = await listMyProjects();

  if (!context.hasIdentity) {
    return <SignInLink />;
  }

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
