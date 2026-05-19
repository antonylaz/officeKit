import { NextResponse } from "next/server";
import { z } from "zod";
import { completeOnboarding } from "@/server/onboarding";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
  totpSecret: z.string().min(16),
  totpToken: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { recoveryCodes } = await completeOnboarding(parsed.data);
    return NextResponse.json({ recoveryCodes });
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
