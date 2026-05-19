import { db } from "@/lib/db";
import { getAuthorizedProject } from "@/server/projects";
import type { PaymentMethod } from "@prisma/client";

export interface PlaceOrderInput {
  projectId: string;
  quoteId: string;
  billing: {
    companyName: string;
    orgNumber: string;
    address: { street: string; postal: string; city: string; country: string };
  };
  deliveryAddress: { street: string; postal: string; city: string; country: string };
  deliveryWindowStart: Date;
  deliveryWindowEnd: Date;
  paymentMethod: PaymentMethod;
  lostReasonForLosers?: string;
}

export async function placeOrder(input: PlaceOrderInput) {
  const project = await getAuthorizedProject(input.projectId);
  if (!project) throw new Error("not_authorized");

  const quote = await db.quote.findFirst({
    where: { id: input.quoteId, rfq: { is: { projectId: input.projectId } }, submittedAt: { not: null } },
    include: { rfq: { include: { supplier: true } } },
  });
  if (!quote) throw new Error("quote_not_found_or_unsubmitted");

  const commissionRate = Number(quote.rfq.supplier.commissionRate);
  const commissionAmount = Math.round(quote.totalAmount * commissionRate);
  const payoutAmount = quote.totalAmount - commissionAmount;
  const now = new Date();

  const order = await db.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: project.companyId },
      data: { name: input.billing.companyName, orgNumber: input.billing.orgNumber, address: input.billing.address as never },
    });

    const ord = await tx.order.create({
      data: {
        projectId: input.projectId,
        quoteId: quote.id,
        supplierId: quote.rfq.supplierId,
        companyId: project.companyId,
        status: "confirmed",
        totalAmount: quote.totalAmount,
        commissionAmount,
        payoutAmount,
        deliveryAddress: input.deliveryAddress as never,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
        paymentMethod: input.paymentMethod,
      },
    });

    await tx.rfq.update({ where: { id: quote.rfqId }, data: { status: "won", decidedAt: now } });
    await tx.rfq.updateMany({
      where: { projectId: input.projectId, NOT: { id: quote.rfqId }, status: { in: ["sent", "viewed", "quoted"] } },
      data: { status: "lost", decidedAt: now, lostReason: input.lostReasonForLosers ?? null },
    });
    await tx.project.update({ where: { id: input.projectId }, data: { status: "ordered" } });

    return ord;
  });

  return { order, winningSupplier: quote.rfq.supplier };
}
