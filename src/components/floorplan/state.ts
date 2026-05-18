import type { ItemMode } from "@prisma/client";

export interface PlacedItem {
  uid: number;
  itemId: string;
  x: number;
  y: number;
  mode: ItemMode;
}

export interface FloorState {
  canvas: { width: number; height: number };
  placed: PlacedItem[];
  selectedUid: number | null;
  nextUid: number;
}

export type Action =
  | { type: "PLACE"; itemId: string; x: number; y: number; mode?: ItemMode }
  | { type: "MOVE"; uid: number; x: number; y: number }
  | { type: "REMOVE"; uid: number }
  | { type: "SELECT"; uid: number | null }
  | { type: "HYDRATE"; placed: PlacedItem[]; nextUid: number };

const snap = (n: number) => Math.round(n);
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

export function initialState(canvas: { width: number; height: number }, placed: PlacedItem[]): FloorState {
  return {
    canvas,
    placed,
    selectedUid: null,
    nextUid: placed.reduce((m, p) => Math.max(m, p.uid), 0) + 1,
  };
}

export function reducer(s: FloorState, a: Action): FloorState {
  switch (a.type) {
    case "PLACE": {
      const x = clamp(snap(a.x), s.canvas.width);
      const y = clamp(snap(a.y), s.canvas.height);
      return { ...s, placed: [...s.placed, { uid: s.nextUid, itemId: a.itemId, x, y, mode: a.mode ?? "new" }], nextUid: s.nextUid + 1 };
    }
    case "MOVE": {
      const x = clamp(snap(a.x), s.canvas.width);
      const y = clamp(snap(a.y), s.canvas.height);
      return { ...s, placed: s.placed.map((p) => (p.uid === a.uid ? { ...p, x, y } : p)) };
    }
    case "REMOVE":
      return { ...s, placed: s.placed.filter((p) => p.uid !== a.uid), selectedUid: s.selectedUid === a.uid ? null : s.selectedUid };
    case "SELECT":
      return { ...s, selectedUid: a.uid };
    case "HYDRATE":
      return { ...s, placed: a.placed, nextUid: a.nextUid };
  }
}
