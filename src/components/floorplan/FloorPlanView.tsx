"use client";
import { useEffect, useReducer, useMemo, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { motion } from "framer-motion";
import { ArrowRight, Sliders } from "lucide-react";
import type { ItemCatalog, Project, ProjectItem } from "@prisma/client";
import { reducer, initialState, type PlacedItem } from "./state";
import { Canvas } from "./Canvas";
import { Palette } from "./Palette";
import { FloorPlanImageUpload } from "./FloorPlanImageUpload";
import { getRoomsForIndustry } from "@/lib/room-presets";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const CELL_PX = 32;

type ProjectWithItems = Project & { items: (ProjectItem & { item: ItemCatalog })[] };

export function FloorPlanView({ project }: { project: ProjectWithItems }) {
  const t = useTranslations();
  const initialPlaced: PlacedItem[] = useMemo(() => {
    const fp =
      (project.floorPlanData as
        | { placed_items?: Array<{ uid?: number; item_id: string; x: number; y: number; mode?: "new" | "used" }> }
        | null) ?? {};
    return (fp.placed_items ?? []).map((p, idx) => ({
      uid: p.uid ?? idx + 1,
      itemId: p.item_id,
      x: p.x,
      y: p.y,
      mode: p.mode ?? "new",
    }));
  }, [project.floorPlanData]);

  const [state, dispatch] = useReducer(reducer, initialState({ width: 22, height: 15 }, initialPlaced));
  const rooms = getRoomsForIndustry(project.industry);

  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string | null>(project.floorPlanImageUrl);
  const [imageOpacity, setImageOpacity] = useState(0.4);

  useEffect(() => {
    const handle = setTimeout(async () => {
      await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          floorPlanData: {
            canvas: { width_cells: state.canvas.width, height_cells: state.canvas.height },
            rooms,
            placed_items: state.placed.map((p) => ({
              uid: p.uid,
              item_id: p.itemId,
              x: p.x,
              y: p.y,
              mode: p.mode,
            })),
          },
        }),
      });
    }, 1000);
    return () => clearTimeout(handle);
  }, [state.placed, project.id, rooms, state.canvas.width, state.canvas.height]);

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    if (id.startsWith("palette:")) {
      const itemId = id.slice("palette:".length);
      const rect = e.over?.rect as { left: number; top: number } | undefined;
      const dropX = e.activatorEvent && "clientX" in e.activatorEvent ? (e.activatorEvent as MouseEvent).clientX : 0;
      const dropY = e.activatorEvent && "clientY" in e.activatorEvent ? (e.activatorEvent as MouseEvent).clientY : 0;
      const cx = rect ? (dropX + e.delta.x - rect.left) / CELL_PX : 0;
      const cy = rect ? (dropY + e.delta.y - rect.top) / CELL_PX : 0;
      dispatch({ type: "PLACE", itemId, x: cx, y: cy });
    } else if (id.startsWith("placed:")) {
      const uid = Number(id.slice("placed:".length));
      const placed = state.placed.find((p) => p.uid === uid);
      if (!placed) return;
      dispatch({ type: "MOVE", uid, x: placed.x + e.delta.x / CELL_PX, y: placed.y + e.delta.y / CELL_PX });
    }
  }

  return (
    <DndContext
      id="floorplan-dnd"
      modifiers={[restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <div
        data-industry={project.industry}
        className="max-w-[1280px] mx-auto px-8 py-12 grid gap-8"
        style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}
      >
        <Palette projectItems={project.items} placed={state.placed} />

        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
              {project.city} · {project.headcount} {t("supplier.rfq.people")}
            </p>
            <h1
              className="mt-2 text-4xl tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              Floor plan
            </h1>
          </motion.div>

          <div className="mb-6">
            <FloorPlanImageUpload
              projectId={project.id}
              currentImageUrl={floorPlanImageUrl}
              onUploaded={setFloorPlanImageUrl}
            />
            {floorPlanImageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 inline-flex items-center gap-3 px-4 py-2 rounded-full border bg-white"
                style={{ borderColor: "var(--color-line)" }}
              >
                <Sliders className="size-3.5" style={{ color: "var(--color-ink-mute)" }} />
                <label
                  className="text-[11px] uppercase tracking-[0.12em] font-semibold"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  {t("floorplan.upload.opacity")}
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={imageOpacity}
                  onChange={(e) => setImageOpacity(Number(e.target.value))}
                  className="w-40"
                />
                <span
                  className="text-xs tabular-nums w-10 text-right"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  {Math.round(imageOpacity * 100)}%
                </span>
              </motion.div>
            )}
          </div>

          <Canvas
            state={state}
            rooms={rooms}
            cellPx={CELL_PX}
            catalog={project.items.map((i) => i.item)}
            dispatch={dispatch}
            backgroundImageUrl={floorPlanImageUrl}
            backgroundOpacity={imageOpacity}
          />

          <Link
            href={`/projects/${project.id}/request`}
            className="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-md hover:shadow-lg transition-shadow"
            style={{ background: "var(--color-terracotta)" }}
          >
            {t("common.cta.requestQuotes")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </DndContext>
  );
}
