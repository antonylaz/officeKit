import { db } from "@/lib/db";
import { addHours } from "date-fns";
import { Resend } from "resend";
import { SupplierRfqNotificationEmail } from "@/emails/SupplierRfqNotification";

export async function fanoutRfqs(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { company: true, items: true },
  });

  const all = await db.supplier.findMany({ where: { active: true } });
  const matching = all.filter((s) => s.verticals.includes(project.industry));
  const chosen = (matching.length >= 3 ? matching : all).slice(0, 3);
  if (chosen.length < 1) throw new Error("no_suppliers");

  const deadline = addHours(new Date(), 4);
  const rfqs = await db.$transaction(
    chosen.map((s) =>
      db.rfq.upsert({
        where: { projectId_supplierId: { projectId, supplierId: s.id } },
        update: { status: "sent", sentAt: new Date(), deadlineAt: deadline },
        create: { projectId, supplierId: s.id, status: "sent", deadlineAt: deadline },
      }),
    ),
  );

  await db.project.update({ where: { id: projectId }, data: { status: "requesting_quotes" } });

  // Send supplier notification emails (best-effort)
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (apiKey && from && !apiKey.startsWith("re_xxx")) {
    const resend = new Resend(apiKey);
    const itemCount = project.items.reduce((n, r) => n + r.quantity, 0);
    for (const rfq of rfqs) {
      const supplierUser = await db.user.findFirst({ where: { supplierId: rfq.supplierId, role: "supplier" } });
      if (!supplierUser?.email) continue;
      try {
        await resend.emails.send({
          from,
          to: supplierUser.email,
          subject: supplierUser.locale === "sv" ? "Ny offertförfrågan på OfficeKit" : "New quote request on OfficeKit",
          react: SupplierRfqNotificationEmail({
            url: `${appUrl}/${supplierUser.locale}/supplier/rfqs/${rfq.id}`,
            industry: project.industry,
            city: project.city,
            headcount: project.headcount,
            itemCount,
            deadlineAt: deadline,
            locale: supplierUser.locale,
          }),
        });
      } catch (e) {
        console.error(`Supplier RFQ email failed for ${supplierUser.email}`, (e as Error).message);
      }
    }
  }

  return rfqs;
}
