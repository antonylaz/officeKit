import { notFound } from "next/navigation";
import { requireSupplier } from "@/lib/supplier-auth";
import { getRfqDetail, markViewed } from "@/server/supplier-rfq";
import { QuoteBuilder } from "@/components/supplier/QuoteBuilder";
import { db } from "@/lib/db";

export default async function SupplierRfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplierId } = await requireSupplier();
  await markViewed(id, supplierId);
  let rfq = await getRfqDetail(id, supplierId);
  if (!rfq) notFound();
  const competitorCount = await db.rfq.count({ where: { projectId: rfq.projectId, NOT: { id: rfq.id } } });

  // Ensure a draft quote exists for the builder to edit
  if (!rfq.quote) {
    // eslint-disable-next-line react-hooks/purity
    const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await db.quote.create({
      data: {
        rfqId: rfq.id,
        totalAmount: 0,
        totalAmountExVat: 0,
        validUntil: twoWeeksFromNow,
        notes: "",
        perks: [],
        lines: {
          create: rfq.project.items.map((pi) => {
            const newPrice = pi.variant?.priceNewOre ?? pi.item.priceNewDefault;
            const usedPrice = pi.variant?.priceUsedDefaultOre ?? pi.item.priceUsedDefault ?? newPrice;
            const unitPrice = pi.mode === "new" ? newPrice : usedPrice;
            return {
              itemId: pi.itemId,
              variantId: pi.variantId,
              quantity: pi.quantity,
              mode: pi.mode,
              unitPrice,
              lineTotal: pi.quantity * unitPrice,
            };
          }),
        },
      },
    });
    rfq = await getRfqDetail(id, supplierId);
    if (!rfq) notFound();
  }

  return <QuoteBuilder rfq={rfq} competitorCount={competitorCount} />;
}
