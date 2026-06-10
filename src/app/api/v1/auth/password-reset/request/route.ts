import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/server/password-reset";

const schema = z.object({
  email: z.string().email().max(160),
  locale: z.enum(["sv", "en"]).default("sv"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  // Even invalid payloads get the generic OK — never leak existence
  if (!parsed.success) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await requestPasswordReset(parsed.data.email, parsed.data.locale, ip);
  return NextResponse.json({ ok: true });
}
