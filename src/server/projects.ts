import { db } from "@/lib/db";
import { computeQuantity } from "@/lib/presets";
import { generateClaimToken, CLAIM_TOKEN_COOKIE } from "@/lib/claim-token";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import type { Industry } from "@prisma/client";

export interface CreateProjectInput {
  industry: Industry;
  headcount: number;
  city: string;
  moveInDate?: Date | null;
  companyName: string;
}

export async function createProjectWithGhostCompany(input: CreateProjectInput) {
  const claimToken = generateClaimToken();

  const project = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: input.companyName, claimToken, createdByUserId: null },
    });
    const project = await tx.project.create({
      data: {
        companyId: company.id,
        claimToken,
        createdByUserId: null,
        name: `${input.companyName} — ${input.city}`,
        industry: input.industry,
        headcount: input.headcount,
        city: input.city,
        moveInDate: input.moveInDate ?? null,
        status: "draft",
      },
    });

    const catalog = await tx.itemCatalog.findMany();
    const itemsToCreate = catalog
      .map((c) => ({
        itemId: c.id,
        quantity: computeQuantity(c.presets as Record<Industry, number>, input.industry, input.headcount),
      }))
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        projectId: project.id,
        itemId: row.itemId,
        quantity: row.quantity,
        mode: "new" as const,
      }));
    if (itemsToCreate.length) {
      await tx.projectItem.createMany({ data: itemsToCreate });
    }

    return project;
  });

  return { project, claimToken };
}

export async function getAuthorizedProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { items: { include: { item: true } } },
  });
  if (!project) return null;

  const session = await auth();
  if (project.createdByUserId && session?.user?.id === project.createdByUserId) return project;

  const jar = await cookies();
  const cookieToken = jar.get(CLAIM_TOKEN_COOKIE)?.value;
  if (project.claimToken && cookieToken === project.claimToken) return project;

  return null;
}
