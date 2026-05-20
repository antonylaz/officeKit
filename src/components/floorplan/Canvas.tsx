"use client";
import { useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { FloorState, Action } from "./state";
import type { RoomOutline } from "@/lib/room-presets";
import type { ItemCatalog } from "@prisma/client";
import { PlacedItemNode } from "./PlacedItem";

export function Canvas({
  state, rooms, cellPx, catalog, dispatch, backgroundImageUrl, backgroundOpacity = 0.4,
}: {
  state: FloorState;
  rooms: RoomOutline[];
  cellPx: number;
  catalog: ItemCatalog[];
  dispatch: React.Dispatch<Action>;
  backgroundImageUrl?: string | null;
  backgroundOpacity?: number;
}) {
  const itemById = new Map(catalog.map((c) => [c.id, c]));
  const { setNodeRef } = useDroppable({ id: "canvas" });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedUid != null) {
        dispatch({ type: "REMOVE", uid: state.selectedUid });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedUid, dispatch]);

  return (
    <div
      ref={setNodeRef}
      onClick={() => dispatch({ type: "SELECT", uid: null })}
      style={{
        position: "relative",
        width: state.canvas.width * cellPx,
        height: state.canvas.height * cellPx,
        backgroundColor: "var(--color-paper)",
        border: "1px solid var(--color-line)",
        overflow: "hidden",
      }}
    >
      {backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: backgroundOpacity,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${cellPx}px), repeating-linear-gradient(90deg, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${cellPx}px)`,
          pointerEvents: "none",
          zIndex: 0,
          opacity: backgroundImageUrl ? 0.35 : 1,
        }}
      />
      {rooms.map((r) => (
        <div key={r.id} style={{
          position: "absolute", left: r.x * cellPx, top: r.y * cellPx, width: r.w * cellPx, height: r.h * cellPx,
          border: "1px dashed var(--color-ink-mute)", color: "var(--color-ink-mute)", padding: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {r.label}
        </div>
      ))}
      {state.placed.map((p) => {
        const item = itemById.get(p.itemId);
        if (!item) return null;
        return (
          <PlacedItemNode
            key={p.uid}
            placed={p}
            item={item}
            cellPx={cellPx}
            selected={state.selectedUid === p.uid}
            onSelect={() => dispatch({ type: "SELECT", uid: p.uid })}
          />
        );
      })}
    </div>
  );
}
