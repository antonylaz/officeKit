import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CLAIM_TOKEN_COOKIE } from "@/lib/claim-token";

export async function claimAnonymousProjects(userId: string) {
  const jar = await cookies();
  const token = jar.get(CLAIM_TOKEN_COOKIE)?.value;
  if (!token) return;

  await db.$transaction([
    db.company.updateMany({ where: { claimToken: token }, data: { createdByUserId: userId, claimToken: null } }),
    db.project.updateMany({ where: { claimToken: token }, data: { createdByUserId: userId, claimToken: null } }),
  ]);

  jar.delete(CLAIM_TOKEN_COOKIE);
}
