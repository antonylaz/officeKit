import { describe, expect, it } from "vitest";
import { reducer, type FloorState, initialState } from "@/components/floorplan/state";

const seed: FloorState = initialState({ width: 22, height: 15 }, []);

describe("floorplan reducer", () => {
  it("places an item at a snapped cell", () => {
    const s = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 3.7, y: 2.4 });
    expect(s.placed).toHaveLength(1);
    expect(s.placed[0]).toMatchObject({ itemId: "desk-electric", x: 4, y: 2 });
  });

  it("clamps placement within canvas bounds", () => {
    const s = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 100, y: 100 });
    expect(s.placed[0]!.x).toBeLessThanOrEqual(22);
    expect(s.placed[0]!.y).toBeLessThanOrEqual(15);
  });

  it("removes a placed item by uid", () => {
    const placed = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 0, y: 0 });
    const removed = reducer(placed, { type: "REMOVE", uid: placed.placed[0]!.uid });
    expect(removed.placed).toHaveLength(0);
  });

  it("moves a placed item by uid with snap", () => {
    const placed = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 0, y: 0 });
    const moved = reducer(placed, { type: "MOVE", uid: placed.placed[0]!.uid, x: 5.5, y: 3.5 });
    expect(moved.placed[0]).toMatchObject({ x: 6, y: 4 });
  });

  it("selects and clears selection", () => {
    const placed = reducer(seed, { type: "PLACE", itemId: "desk-electric", x: 0, y: 0 });
    const selected = reducer(placed, { type: "SELECT", uid: placed.placed[0]!.uid });
    expect(selected.selectedUid).toBe(placed.placed[0]!.uid);
    const cleared = reducer(selected, { type: "SELECT", uid: null });
    expect(cleared.selectedUid).toBe(null);
  });
});
