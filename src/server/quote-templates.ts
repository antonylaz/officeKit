import { db } from "@/lib/db";
import type { ItemMode } from "@prisma/client";

export interface TemplateLineInput {
  itemId: string;
  mode: ItemMode;
  unitPrice: number;
}

export interface SaveTemplateInput {
  supplierId: string;
  name: string;
  notes?: string | null;
  perks?: string[];
  lines: TemplateLineInput[];
}

export async function listSupplierTemplates(supplierId: string) {
  return db.quoteTemplate.findMany({
    where: { supplierId },
    include: {
      lines: { include: { item: { select: { id: true, name: true, icon: true, category: true, subcategory: true } } } },
    },
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export async function saveTemplate(input: SaveTemplateInput) {
  // upsert by (supplierId, name) — replaces an existing template with the same name
  const existing = await db.quoteTemplate.findUnique({
    where: { supplierId_name: { supplierId: input.supplierId, name: input.name } },
  });
  if (existing) {
    return db.quoteTemplate.update({
      where: { id: existing.id },
      data: {
        notes: input.notes ?? null,
        perks: input.perks ?? [],
        lines: {
          deleteMany: {},
          create: input.lines.map((l) => ({
            itemId: l.itemId,
            mode: l.mode,
            unitPrice: l.unitPrice,
          })),
        },
      },
      include: { lines: true },
    });
  }
  return db.quoteTemplate.create({
    data: {
      supplierId: input.supplierId,
      name: input.name,
      notes: input.notes ?? null,
      perks: input.perks ?? [],
      lines: {
        create: input.lines.map((l) => ({
          itemId: l.itemId,
          mode: l.mode,
          unitPrice: l.unitPrice,
        })),
      },
    },
    include: { lines: true },
  });
}

export async function deleteTemplate(id: string, supplierId: string) {
  // Scoped delete — never touch another supplier's templates
  await db.quoteTemplate.deleteMany({ where: { id, supplierId } });
}

/**
 * Apply a template to an existing quote draft. Replaces all draft lines with the
 * template lines, preserves the buyer's requested quantities by matching itemId
 * against the project's items (so the supplier picks pricing only — not quantity).
 */
export async function applyTemplateToDraft(
  templateId: string,
  rfqId: string,
  supplierId: string,
) {
  const template = await db.quoteTemplate.findFirst({
    where: { id: templateId, supplierId },
    include: { lines: true },
  });
  if (!template) throw new Error("template_not_found");

  const rfq = await db.rfq.findFirst({
    where: { id: rfqId, supplierId },
    include: {
      project: { include: { items: true } },
      quote: { select: { id: true } },
    },
  });
  if (!rfq) throw new Error("rfq_not_found");

  // Map template item → projectItem to inherit the buyer's quantity. Drop template
  // lines that aren't in this project (different mix).
  const projectItemById = new Map(rfq.project.items.map((i) => [i.itemId, i]));
  const newLines = template.lines
    .map((t) => {
      const pi = projectItemById.get(t.itemId);
      if (!pi) return null;
      return {
        itemId: t.itemId,
        mode: t.mode,
        quantity: pi.quantity,
        unitPrice: t.unitPrice,
        lineTotal: t.unitPrice * pi.quantity,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (newLines.length === 0) throw new Error("template_does_not_match_project");

  const subtotal = newLines.reduce((s, l) => s + l.lineTotal, 0);
  const total = Math.round(subtotal * 1.25);

  // Upsert the quote draft with the new lines
  if (rfq.quote) {
    await db.$transaction([
      db.quoteLine.deleteMany({ where: { quoteId: rfq.quote.id } }),
      db.quote.update({
        where: { id: rfq.quote.id },
        data: {
          totalAmount: total,
          totalAmountExVat: subtotal,
          notes: template.notes ?? "",
          perks: template.perks,
          lines: { create: newLines },
        },
      }),
    ]);
  } else {
    await db.quote.create({
      data: {
        rfqId,
        totalAmount: total,
        totalAmountExVat: subtotal,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: template.notes ?? "",
        perks: template.perks,
        submittedAt: null,
        lines: { create: newLines },
      },
    });
  }

  // Bump usage counters
  await db.quoteTemplate.update({
    where: { id: templateId },
    data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
  });

  return { applied: newLines.length, totalTemplateLines: template.lines.length };
}
