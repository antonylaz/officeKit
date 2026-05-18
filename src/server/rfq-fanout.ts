import { db } from "@/lib/db";
import { addHours } from "date-fns";

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
  return rfqs;
}
