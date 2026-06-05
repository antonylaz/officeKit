import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CLAIM_TOKEN_COOKIE } from "@/lib/claim-token";

export interface MyProjectsContext {
  userId: string | null;
  userEmail: string | null;
  claimToken: string | null;
  /** True if either an auth session or a claim cookie is present */
  hasIdentity: boolean;
}

export async function getMyProjectsContext(): Promise<MyProjectsContext> {
  const session = await auth();
  const jar = await cookies();
  const claimToken = jar.get(CLAIM_TOKEN_COOKIE)?.value ?? null;
  return {
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
    claimToken,
    hasIdentity: Boolean(session?.user?.id || claimToken),
  };
}

export async function listMyProjects() {
  const ctx = await getMyProjectsContext();
  if (!ctx.hasIdentity) return { projects: [], context: ctx };

  // OR: auth-linked OR claim-cookie-linked
  const where = {
    OR: [
      ...(ctx.userId ? [{ createdByUserId: ctx.userId }] : []),
      ...(ctx.claimToken ? [{ claimToken: ctx.claimToken }] : []),
    ],
  };
  // Empty OR would match everything — guard.
  if (where.OR.length === 0) return { projects: [], context: ctx };

  const projects = await db.project.findMany({
    where,
    include: {
      _count: { select: { items: true, rfqs: true, orders: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return { projects, context: ctx };
}
