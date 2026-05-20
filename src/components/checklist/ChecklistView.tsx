"use client";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import type { ItemCatalog, Project, ProjectItem, ProductVariant } from "@prisma/client";
import { CategoryTabs } from "./CategoryTabs";
import { ItemRow } from "./ItemRow";
import { SummarySidebar } from "./SummarySidebar";
import { VariantPickerModal } from "./VariantPickerModal";
import type { ProjectSummary } from "@/server/project-summary";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { groupItemsBySubcategory } from "@/lib/group-items";

type ProjectWithItems = Project & { items: (ProjectItem & { item: ItemCatalog; variant: ProductVariant | null })[] };
type Category = ItemCatalog["category"];

export function ChecklistView({
  project,
  catalog,
  initialSummary,
}: {
  project: ProjectWithItems;
  catalog: ItemCatalog[];
  initialSummary: ProjectSummary;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<Category>("workstations");
  const [items, setItems] = useState(project.items);
  const [summary, setSummary] = useState(initialSummary);
  const [pickerForItemId, setPickerForItemId] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<Category, ItemCatalog[]>();
    for (const c of catalog) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return map;
  }, [catalog]);

  const lineFor = (itemId: string) => items.find((l) => l.itemId === itemId);

  const upsertMut = useMutation({
    mutationFn: async (input: { itemId: string; quantity: number; mode: "new" | "used"; variantId?: string | null }) => {
      const res = await fetch(`/api/v1/projects/${project.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("upsert failed");
      return res.json() as Promise<{ summary: ProjectSummary; items: typeof items }>;
    },
    onSuccess: (data) => { setItems(data.items); setSummary(data.summary); },
  });

  const patchMut = useMutation({
    mutationFn: async (input: { lineId: string; quantity?: number; mode?: "new" | "used"; variantId?: string | null }) => {
      const { lineId, ...patch } = input;
      const res = await fetch(`/api/v1/projects/${project.id}/items/${lineId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("patch failed");
      return res.json() as Promise<{ summary: ProjectSummary; items: typeof items }>;
    },
    onSuccess: (data) => { setItems(data.items); setSummary(data.summary); },
  });

  const onQuantity = (catalogItem: ItemCatalog, qty: number) => {
    const line = lineFor(catalogItem.id);
    if (line) patchMut.mutate({ lineId: line.id, quantity: qty });
    else if (qty > 0) upsertMut.mutate({ itemId: catalogItem.id, quantity: qty, mode: "new" });
  };

  const onMode = (catalogItem: ItemCatalog, mode: "new" | "used") => {
    const line = lineFor(catalogItem.id);
    if (line) patchMut.mutate({ lineId: line.id, mode });
    else upsertMut.mutate({ itemId: catalogItem.id, quantity: 1, mode });
  };

  const onPickVariant = (catalogItem: ItemCatalog, variant: ProductVariant | null) => {
    const line = lineFor(catalogItem.id);
    if (line) {
      patchMut.mutate({ lineId: line.id, variantId: variant?.id ?? null });
    } else {
      // Picking a variant on a row with qty=0: create the line with qty=1
      upsertMut.mutate({ itemId: catalogItem.id, quantity: 1, mode: "new", variantId: variant?.id ?? null });
    }
    setPickerForItemId(null);
  };

  return (
    <div data-industry={project.industry} style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 48 }}>
      <div>
        <CategoryTabs active={tab} onChange={setTab} />
        <div style={{ marginTop: 32 }}>
          {(() => {
            const tabItems = byCategory.get(tab) ?? [];
            const { groups, ungrouped } = groupItemsBySubcategory(tabItems);
            return (
              <>
                {groups.map((group) => (
                  <details
                    key={group.key}
                    open
                    style={{ marginBottom: 24, border: "1px solid var(--color-line)", borderRadius: 8, overflow: "hidden", background: "var(--color-paper)" }}
                  >
                    <summary
                      style={{
                        listStyle: "none",
                        padding: "14px 18px",
                        cursor: "pointer",
                        background: "var(--color-cream-2, var(--color-cream))",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--color-ink-mute)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        userSelect: "none",
                      }}
                    >
                      <span>{t(`subcategory.${group.key}`)}</span>
                      <span style={{ fontSize: 11, color: "var(--color-ink-mute)" }}>{group.items.length}</span>
                    </summary>
                    <div style={{ padding: "8px 18px 16px" }}>
                      {group.items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          line={lineFor(item.id)}
                          onQuantity={(q) => onQuantity(item, q)}
                          onMode={(m) => onMode(item, m)}
                          onChooseModel={() => setPickerForItemId(item.id)}
                        />
                      ))}
                    </div>
                  </details>
                ))}
                {ungrouped.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    line={lineFor(item.id)}
                    onQuantity={(q) => onQuantity(item, q)}
                    onMode={(m) => onMode(item, m)}
                    onChooseModel={() => setPickerForItemId(item.id)}
                  />
                ))}
              </>
            );
          })()}
        </div>
      </div>
      <div>
        <SummarySidebar summary={summary} city={project.city} />
        <Link
          href={`/projects/${project.id}/floorplan`}
          style={{ display: "block", textAlign: "center", marginTop: 16, padding: 16, background: "var(--ok-accent)", color: "white", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 600, textDecoration: "none", borderRadius: 4 }}
        >
          {t("checklist.continueToFloorplan")}
        </Link>
      </div>

      {pickerForItemId && (() => {
        const cat = catalog.find((c) => c.id === pickerForItemId);
        if (!cat) return null;
        const currentVariantId = lineFor(pickerForItemId)?.variantId ?? null;
        return (
          <VariantPickerModal
            item={cat}
            currentVariantId={currentVariantId}
            onClose={() => setPickerForItemId(null)}
            onPick={(variant) => onPickVariant(cat, variant)}
          />
        );
      })()}
    </div>
  );
}
