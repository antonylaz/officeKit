import { db } from "@/lib/db";
import { addVat } from "@/lib/money";
import { addDays } from "date-fns";
import type { ItemMode } from "@prisma/client";

export interface DraftLineInput {
  itemId: string;
  variantId?: string | null;
  quantity: number;
  mode: ItemMode;
  unitPrice: number; // öre ex VAT
}

export interface DraftQuoteInput {
  rfqId: string;
  supplierId: string;
  lines: DraftLineInput[];
  notes: string;
  perks: string[];
}

export async function upsertDraft(input: DraftQuoteInput) {
  const rfq = await db.rfq.findFirst({
    where: { id: input.rfqId, supplierId: input.supplierId },
  });
  if (!rfq) throw new Error("not_found");

  const subtotal = input.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = addVat(subtotal);

  const quote = await db.quote.upsert({
    where: { rfqId: input.rfqId },
    create: {
      rfqId: input.rfqId,
      totalAmount: total,
      totalAmountExVat: subtotal,
      validUntil: addDays(new Date(), 14),
      notes: input.notes,
      perks: input.perks,
      submittedAt: null,
      lines: {
        create: input.lines.map((l) => ({
          itemId: l.itemId,
          variantId: l.variantId ?? null,
          quantity: l.quantity,
          mode: l.mode,
          unitPrice: l.unitPrice,
          lineTotal: l.unitPrice * l.quantity,
        })),
      },
    },
    update: {
      totalAmount: total,
      totalAmountExVat: subtotal,
      notes: input.notes,
      perks: input.perks,
      lines: {
        deleteMany: {},
        create: input.lines.map((l) => ({
          itemId: l.itemId,
          variantId: l.variantId ?? null,
          quantity: l.quantity,
          mode: l.mode,
          unitPrice: l.unitPrice,
          lineTotal: l.unitPrice * l.quantity,
        })),
      },
    },
    include: { lines: true },
  });

  return quote;
}

export async function submitQuote(rfqId: string, supplierId: string) {
  const user = await db.user.findFirst({ where: { supplierId, role: "supplier", twoFaEnabled: true } });
  if (!user) throw new Error("2fa_required");

  const quote = await db.quote.findFirst({
    where: { rfqId, rfq: { supplierId } },
    include: { lines: true },
  });
  if (!quote) throw new Error("draft_not_found");
  if (quote.lines.length === 0) throw new Error("no_lines");

  const now = new Date();
  await db.$transaction([
    db.quote.update({ where: { id: quote.id }, data: { submittedAt: now } }),
    db.rfq.update({ where: { id: rfqId }, data: { status: "quoted", quotedAt: now } }),
  ]);

  // Fire-and-forget buyer notification — never blocks quote submission
  void (async () => {
    const { notifyBuyerQuoteReceived } = await import("@/server/buyer-notifications");
    await notifyBuyerQuoteReceived(rfqId);
  })();

  return db.quote.findUnique({ where: { id: quote.id }, include: { lines: { include: { item: true } } } });
}
