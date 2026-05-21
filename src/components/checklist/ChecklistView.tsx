"use client";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    onSuccess: (data) => {
      setItems(data.items);
      setSummary(data.summary);
    },
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
    onSuccess: (data) => {
      setItems(data.items);
      setSummary(data.summary);
    },
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
      upsertMut.mutate({ itemId: catalogItem.id, quantity: 1, mode: "new", variantId: variant?.id ?? null });
    }
    setPickerForItemId(null);
  };

  const tabItems = byCategory.get(tab) ?? [];
  const { groups, ungrouped } = groupItemsBySubcategory(tabItems);

  return (
    <div
      data-industry={project.industry}
      className="max-w-[1280px] mx-auto px-8 py-12 grid gap-12"
      style={{ gridTemplateColumns: "1fr 360px" }}
    >
      <div>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
            {project.city} · {project.headcount} {t("supplier.rfq.people")}
          </p>
          <h1
            className="mt-2 text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {project.name}
          </h1>
        </div>

        <CategoryTabs active={tab} onChange={setTab} />

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-8"
        >
          {groups.map((group) => {
            const groupKey = `${tab}:${group.key}`;
            const open = openGroups[groupKey] ?? true;
            return (
              <div
                key={group.key}
                className="mb-6 border rounded-2xl overflow-hidden"
                style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroups((s) => ({ ...s, [groupKey]: !open }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 select-none transition-colors hover:brightness-[0.98]"
                  style={{ background: "var(--color-cream-2, var(--color-cream))" }}
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--color-ink-mute)" }}
                  >
                    {t(`subcategory.${group.key}`)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
                      {group.items.length}
                    </span>
                    <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="size-4" style={{ color: "var(--color-ink-mute)" }} />
                    </motion.span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-5 pb-4 pt-2">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
        </motion.div>
      </div>

      <div className="sticky top-8 self-start">
        <SummarySidebar summary={summary} city={project.city} />
        <Link
          href={`/projects/${project.id}/floorplan`}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-md hover:shadow-lg transition-shadow"
          style={{ background: "var(--color-terracotta)" }}
        >
          {t("checklist.continueToFloorplan")}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {pickerForItemId &&
        (() => {
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
