import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeResetToken } from "@/server/password-reset";

const schema = z.object({
  token: z.string().min(16).max(256),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await consumeResetToken(parsed.data.token, parsed.data.newPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "invalid" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
