import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CLAIM_TOKEN_COOKIE } from "@/lib/claim-token";
import { fanoutRfqs } from "@/server/rfq-fanout";
import { Resend } from "resend";
import { QuoteRequestConfirmationEmail } from "@/emails/QuoteRequestConfirmation";

export async function claimAnonymousProjects(userId: string) {
  const jar = await cookies();
  const token = jar.get(CLAIM_TOKEN_COOKIE)?.value;
  if (!token) return;

  // Find projects to claim BEFORE clearing tokens, so we know which ones to fan out
  const projectsToClaim = await db.project.findMany({
    where: { claimToken: token },
    include: { rfqs: true },
  });

  await db.$transaction([
    db.company.updateMany({ where: { claimToken: token }, data: { createdByUserId: userId, claimToken: null } }),
    db.project.updateMany({ where: { claimToken: token }, data: { createdByUserId: userId, claimToken: null } }),
  ]);

  jar.delete(CLAIM_TOKEN_COOKIE);

  // For each pending RFQ-request project that has no RFQs yet, fan them out
  const user = await db.user.findUnique({ where: { id: userId } });
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  for (const project of projectsToClaim) {
    if (project.status === "requesting_quotes" && project.rfqs.length === 0) {
      try {
        await fanoutRfqs(project.id);
        if (resend && fromEmail && user?.email) {
          await resend.emails.send({
            from: fromEmail,
            to: user.email,
            subject: "OfficeKit — quote request sent",
            react: QuoteRequestConfirmationEmail({ projectId: project.id, locale: "sv" }),
          });
        }
      } catch (err) {
        console.error(`Failed to fan out RFQs for project ${project.id}`, err);
        // Don't throw — don't block sign-in. The user can retry from the confirmation page if needed.
      }
    }
  }
}
