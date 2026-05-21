"use client";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import type { PlacedItem } from "./state";

export function Palette({
  projectItems,
  placed,
}: {
  projectItems: (ProjectItem & { item: ItemCatalog })[];
  placed: PlacedItem[];
}) {
  const placedCount = (itemId: string) => placed.filter((p) => p.itemId === itemId).length;
  const activeItems = projectItems.filter((p) => p.quantity > 0);

  return (
    <aside
      className="rounded-2xl border p-4 max-h-[70vh] overflow-y-auto sticky top-8 self-start"
      style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
          Palette
        </h3>
        <span
          className="text-[10px] uppercase tracking-[0.12em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {activeItems.length} items
        </span>
      </div>
      <div className="grid gap-2">
        {activeItems.map((p) => (
          <PaletteCard key={p.itemId} item={p.item} placed={placedCount(p.itemId)} total={p.quantity} />
        ))}
      </div>
    </aside>
  );
}

function PaletteCard({ item, placed, total }: { item: ItemCatalog; placed: number; total: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${item.id}` });
  const allPlaced = placed >= total;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-white cursor-grab active:cursor-grabbing transition-all hover:shadow-sm"
      style={{
        borderColor: "var(--color-line)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <GripVertical className="size-4 shrink-0" style={{ color: "var(--color-ink-mute)" }} />
      <span className="text-xl shrink-0" aria-hidden>
        {item.icon}
      </span>
      <div className="flex-1 min-w-0 text-[13px]">
        <div className="font-semibold truncate">{item.name}</div>
        <div className="text-[11px]" style={{ color: allPlaced ? "var(--color-green-leaf)" : "var(--color-ink-mute)" }}>
          {placed} of {total} placed
        </div>
      </div>
    </div>
  );
}
