import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOnboardingToken, prepareOnboarding } from "@/server/onboarding";

const schema = z.object({ token: z.string().min(20) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await verifyOnboardingToken(parsed.data.token);
  if (!user) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  const prep = await prepareOnboarding(user.email);
  return NextResponse.json({ email: user.email, name: user.name, supplier: { name: user.supplier?.name }, ...prep });
}
