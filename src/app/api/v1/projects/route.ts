import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createProjectWithGhostCompany } from "@/server/projects";
import { CLAIM_TOKEN_COOKIE, CLAIM_TOKEN_TTL_DAYS } from "@/lib/claim-token";

const schema = z.object({
  industry: z.enum(["it", "finance", "sales", "law"]),
  headcount: z.number().int().min(1).max(500),
  city: z.string().min(1).max(80),
  moveInDate: z.string().datetime().optional().nullable(),
  companyName: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const { project, claimToken } = await createProjectWithGhostCompany({
    ...input,
    moveInDate: input.moveInDate ? new Date(input.moveInDate) : null,
  });
  const jar = await cookies();
  jar.set(CLAIM_TOKEN_COOKIE, claimToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CLAIM_TOKEN_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return NextResponse.json({ id: project.id });
}
