import type { ItemCatalog, ProjectItem } from "@prisma/client";
import { addVat, VAT_RATE } from "@/lib/money";

export interface ProjectSummary {
  itemsSelected: number;
  newUnits: number;
  usedUnits: number;
  subtotalOre: number;
  vatOre: number;
  totalOre: number;
}

export function computeSummary(items: (ProjectItem & { item: ItemCatalog })[]): ProjectSummary {
  let newUnits = 0, usedUnits = 0, subtotalOre = 0;
  for (const row of items) {
    if (row.mode === "new") newUnits += row.quantity;
    else usedUnits += row.quantity;
    const unit = row.mode === "new" ? row.item.priceNewDefault : (row.item.priceUsedDefault ?? row.item.priceNewDefault);
    subtotalOre += unit * row.quantity;
  }
  const totalOre = addVat(subtotalOre);
  return {
    itemsSelected: items.reduce((n, r) => n + r.quantity, 0),
    newUnits,
    usedUnits,
    subtotalOre,
    vatOre: totalOre - subtotalOre,
    totalOre,
  };
}

export { VAT_RATE };
