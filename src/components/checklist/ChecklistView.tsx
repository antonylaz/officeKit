"use client";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import type { ItemCatalog, Project, ProjectItem, ProductVariant } from "@prisma/client";
import { CategoryTabs } from "./CategoryTabs";
import { ItemRow } from "./ItemRow";
import { SummarySidebar } from "./SummarySidebar";
import { ItemDetailDrawer, type DrawerState } from "./ItemDetailDrawer";
import type { ProjectSummary } from "@/server/project-summary";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { groupItemsBySubcategory } from "@/lib/group-items";

type ProjectWithItems = Project & {
  items: (ProjectItem & { item: ItemCatalog; variant: ProductVariant | null })[];
};
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
  const [openItemId, setOpenItemId] = useState<string | null>(null);
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
    mutationFn: async (input: {
      itemId: string;
      quantity: number;
      mode: "new" | "used";
      variantId?: string | null;
    }) => {
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
    mutationFn: async (input: {
      lineId: string;
      quantity?: number;
      mode?: "new" | "used";
      variantId?: string | null;
    }) => {
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

  function applyChange(catalogItem: ItemCatalog, change: Partial<DrawerState>) {
    const line = lineFor(catalogItem.id);
    if (line) {
      patchMut.mutate({ lineId: line.id, ...change });
    } else if (change.quantity && change.quantity > 0) {
      upsertMut.mutate({
        itemId: catalogItem.id,
        quantity: change.quantity,
        mode: change.mode ?? "new",
        variantId: change.variantId ?? null,
      });
    } else if (change.variantId !== undefined || change.mode !== undefined) {
      // Variant/mode set before quantity — create line with qty 1
      upsertMut.mutate({
        itemId: catalogItem.id,
        quantity: 1,
        mode: change.mode ?? "new",
        variantId: change.variantId ?? null,
      });
    }
  }

  const onQuantityRow = (catalogItem: ItemCatalog, qty: number) =>
    applyChange(catalogItem, { quantity: qty });

  // Drawer state derived from current line
  const openItem = openItemId ? catalog.find((c) => c.id === openItemId) ?? null : null;
  const openLine = openItemId ? lineFor(openItemId) : null;
  const drawerState: DrawerState = {
    variantId: openLine?.variantId ?? null,
    mode: openLine?.mode ?? "new",
    quantity: openLine?.quantity ?? 0,
  };

  function onDrawerUpdate(patch: Partial<DrawerState>) {
    if (!openItem) return;
    applyChange(openItem, patch);
  }

  const tabItems = byCategory.get(tab) ?? [];
  const { groups, ungrouped } = groupItemsBySubcategory(tabItems);

  return (
    <div
      data-industry={project.industry}
      className="max-w-[1280px] mx-auto px-8 py-12 grid gap-12"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 340px" }}
    >
      <div>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
            {project.city} · {project.headcount} {t("supplier.rfq.people")} · {project.industry.toUpperCase()}
          </p>
          <h1
            className="mt-2 text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {t("checklist.pageTitle")}
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
              <div key={group.key} className="mb-6">
                <button
                  type="button"
                  onClick={() => setOpenGroups((s) => ({ ...s, [groupKey]: !open }))}
                  className="w-full flex items-center justify-between px-1 py-2 select-none transition-opacity hover:opacity-80"
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--color-ink-mute)" }}
                  >
                    {t(`subcategory.${group.key}`)}
                    <span className="ml-2" style={{ color: "var(--color-ink-mute)" }}>
                      · {group.items.length}
                    </span>
                  </span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="size-4" style={{ color: "var(--color-ink-mute)" }} />
                  </motion.span>
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
                      <div className="pt-3">
                        {group.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            line={lineFor(item.id)}
                            onQuantity={(q) => onQuantityRow(item, q)}
                            onOpen={() => setOpenItemId(item.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div className="pt-2">
              {ungrouped.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  line={lineFor(item.id)}
                  onQuantity={(q) => onQuantityRow(item, q)}
                  onOpen={() => setOpenItemId(item.id)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <div className="sticky top-8 self-start">
        <SummarySidebar summary={summary} city={project.city} />
        <Link
          href={`/projects/${project.id}/floorplan`}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-md hover:shadow-lg transition-shadow"
          style={{ background: "var(--color-cta)" }}
        >
          {t("checklist.continueToFloorplan")}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <ItemDetailDrawer
        item={openItem}
        state={drawerState}
        onClose={() => setOpenItemId(null)}
        onUpdate={onDrawerUpdate}
      />
    </div>
  );
}
