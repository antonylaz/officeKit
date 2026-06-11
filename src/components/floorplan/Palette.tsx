"use client";
import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search } from "lucide-react";
import type { ItemCatalog, ProjectItem } from "@prisma/client";
import type { PlacedItem } from "./state";
import { CatalogIcon } from "@/lib/catalog-icon";

interface PaletteProps {
  projectItems: (ProjectItem & { item: ItemCatalog })[];
  placed: PlacedItem[];
}

export function Palette({ projectItems, placed }: PaletteProps) {
  const [query, setQuery] = useState("");
  const placedCount = (itemId: string) => placed.filter((p) => p.itemId === itemId).length;
  const activeItems = useMemo(
    () => projectItems.filter((p) => p.quantity > 0),
    [projectItems],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return activeItems;
    const q = query.toLowerCase();
    return activeItems.filter(
      (p) => p.item.name.toLowerCase().includes(q) || p.item.category.toLowerCase().includes(q),
    );
  }, [activeItems, query]);

  // Group by category for visual sectioning
  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const arr = map.get(p.item.category) ?? [];
      arr.push(p);
      map.set(p.item.category, arr);
    }
    return map;
  }, [filtered]);

  return (
    <aside
      className="rounded-2xl border sticky top-8 self-start overflow-hidden flex flex-col"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper)",
        maxHeight: "calc(100vh - 64px)",
      }}
    >
      <div className="px-3 py-3 border-b" style={{ borderColor: "var(--color-line)" }}>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Palette
          </h3>
          <span
            className="text-[10px] uppercase tracking-[0.1em] font-semibold tabular-nums"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {activeItems.length}
          </span>
        </div>
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 size-3"
            style={{ color: "var(--color-ink-mute)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border pl-7 pr-2 py-1.5 text-xs outline-none focus:ring-2 transition-shadow"
            style={{ background: "white", borderColor: "var(--color-line)" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {[...byCategory.entries()].map(([category, items]) => (
          <div key={category}>
            <p
              className="px-1 pb-1 text-[9px] uppercase tracking-[0.14em] font-semibold"
              style={{ color: "var(--color-ink-mute)" }}
            >
              {category}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((p) => (
                <PaletteChip
                  key={p.itemId}
                  item={p.item}
                  placed={placedCount(p.itemId)}
                  total={p.quantity}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p
            className="text-center text-xs py-6"
            style={{ color: "var(--color-ink-mute)" }}
          >
            No matches
          </p>
        )}
      </div>
    </aside>
  );
}

function PaletteChip({ item, placed, total }: { item: ItemCatalog; placed: number; total: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${item.id}` });
  const remaining = total - placed;
  const allPlaced = remaining <= 0;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      disabled={allPlaced}
      title={`${item.name} — ${placed}/${total}`}
      className="group relative aspect-square rounded-lg border flex items-center justify-center text-xl transition-all cursor-grab active:cursor-grabbing hover:shadow-sm focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: "white",
        borderColor: "var(--color-line)",
        opacity: isDragging ? 0.4 : undefined,
      }}
      aria-label={`${item.name}: ${placed} of ${total} placed`}
    >
      <CatalogIcon item={item} className="size-5" />

      {/* Count badge */}
      <span
        className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-bold tabular-nums shadow-sm"
        style={{
          background: allPlaced ? "var(--color-green-leaf)" : "var(--color-ink)",
          color: "white",
        }}
      >
        {allPlaced ? "✓" : remaining}
      </span>

      {/* Tooltip on hover */}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ background: "var(--color-ink)", color: "white" }}
      >
        {item.name}
      </span>
    </button>
  );
}
