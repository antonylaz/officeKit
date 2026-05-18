"use client";
import { useDraggable } from "@dnd-kit/core";
import type { PlacedItem as P } from "./state";
import type { ItemCatalog } from "@prisma/client";

export function PlacedItemNode({ placed, item, cellPx, selected, onSelect }: { placed: P; item: ItemCatalog; cellPx: number; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `placed:${placed.uid}` });
  const style: React.CSSProperties = {
    position: "absolute",
    left: placed.x * cellPx,
    top: placed.y * cellPx,
    width: item.widthCells * cellPx,
    height: item.heightCells * cellPx,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    background: selected ? "var(--color-terracotta)" : "var(--color-cream-2)",
    color: selected ? "white" : "var(--color-ink)",
    border: "1px solid var(--color-line)",
    borderRadius: 2,
    cursor: "grab",
    fontSize: 11,
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {item.icon} <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
    </div>
  );
}
