import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, signIn } from "@/lib/auth";
import { fanoutRfqs } from "@/server/rfq-fanout";
import { getAuthorizedProject } from "@/server/projects";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { QuoteRequestConfirmationEmail } from "@/emails/QuoteRequestConfirmation";

const schema = z.object({ email: z.string().email().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await getAuthorizedProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = await auth();
  if (!session?.user?.id) {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success || !parsed.data.email) {
      return NextResponse.json({ error: "email_required" }, { status: 401 });
    }
    await signIn("resend", { email: parsed.data.email, redirectTo: `/sv/projects/${id}/confirmation`, redirect: false });
    await db.project.update({ where: { id }, data: { status: "requesting_quotes" } });
    return NextResponse.json({ status: "magic_link_sent" });
  }

  if (project.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await fanoutRfqs(id);
  const resend = new Resend(process.env.RESEND_API_KEY!);
  if (session.user.email) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: session.user.email,
      subject: "OfficeKit — quote request sent",
      react: QuoteRequestConfirmationEmail({ projectId: id, locale: "sv" }),
    });
  }
  return NextResponse.json({ status: "sent" });
}
