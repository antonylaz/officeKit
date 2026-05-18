"use client";
import { useDraggable } from "@dnd-kit/core";
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import type { PlacedItem } from "./state";

export function Palette({ projectItems, placed }: { projectItems: (ProjectItem & { item: ItemCatalog })[]; placed: PlacedItem[] }) {
  const placedCount = (itemId: string) => placed.filter((p) => p.itemId === itemId).length;
  return (
    <aside style={{ border: "1px solid var(--color-line)", borderRadius: 4, padding: 16, background: "var(--color-paper)", maxHeight: "70vh", overflowY: "auto" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Palette</h3>
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        {projectItems.filter((p) => p.quantity > 0).map((p) => (
          <PaletteCard key={p.itemId} item={p.item} placed={placedCount(p.itemId)} total={p.quantity} />
        ))}
      </div>
    </aside>
  );
}

function PaletteCard({ item, placed, total }: { item: ItemCatalog; placed: number; total: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${item.id}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, border: "1px solid var(--color-line)", borderRadius: 4, cursor: "grab", background: "white", opacity: isDragging ? 0.5 : 1 }}>
      <span style={{ fontSize: 24 }}>{item.icon}</span>
      <div style={{ flex: 1, fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        <div style={{ color: "var(--color-ink-mute)", fontSize: 11 }}>{placed} of {total} placed</div>
      </div>
    </div>
  );
}
