import { describe, expect, it } from "vitest";
import { groupItemsBySubcategory } from "@/lib/group-items";

describe("groupItemsBySubcategory", () => {
  it("returns empty groups + empty ungrouped for empty input", () => {
    const result = groupItemsBySubcategory([]);
    expect(result.groups).toEqual([]);
    expect(result.ungrouped).toEqual([]);
  });

  it("places items with no subcategory into ungrouped, preserving order", () => {
    const items = [
      { id: "a", subcategory: null },
      { id: "b", subcategory: undefined },
      { id: "c" },
    ];
    const result = groupItemsBySubcategory(items);
    expect(result.groups).toEqual([]);
    expect(result.ungrouped.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("groups items by subcategory and sorts within group by subcategoryRank", () => {
    const items = [
      { id: "monitor-32", subcategory: "monitors", subcategoryRank: 2 },
      { id: "monitor-24", subcategory: "monitors", subcategoryRank: 0 },
      { id: "monitor-27", subcategory: "monitors", subcategoryRank: 1 },
    ];
    const result = groupItemsBySubcategory(items);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]!.key).toBe("monitors");
    expect(result.groups[0]!.items.map((i) => i.id)).toEqual(["monitor-24", "monitor-27", "monitor-32"]);
  });

  it("breaks ties on subcategoryRank by id alphabetical", () => {
    const items = [
      { id: "chair-c", subcategory: "chairs", subcategoryRank: 0 },
      { id: "chair-a", subcategory: "chairs", subcategoryRank: 0 },
      { id: "chair-b", subcategory: "chairs", subcategoryRank: 0 },
    ];
    const result = groupItemsBySubcategory(items);
    expect(result.groups[0]!.items.map((i) => i.id)).toEqual(["chair-a", "chair-b", "chair-c"]);
  });

  it("orders groups by lowest rank within group, ties broken alphabetically by key", () => {
    const items = [
      { id: "x1", subcategory: "zebras", subcategoryRank: 5 },
      { id: "y1", subcategory: "chairs", subcategoryRank: 3 },
      { id: "z1", subcategory: "monitors", subcategoryRank: 0 },
    ];
    const result = groupItemsBySubcategory(items);
    expect(result.groups.map((g) => g.key)).toEqual(["monitors", "chairs", "zebras"]);
  });

  it("ties group order to lowest rank — not first-item rank", () => {
    const items = [
      { id: "x1", subcategory: "A", subcategoryRank: 99 },
      { id: "x2", subcategory: "A", subcategoryRank: 1 },
      { id: "y1", subcategory: "B", subcategoryRank: 2 },
    ];
    const result = groupItemsBySubcategory(items);
    // A's lowest rank is 1; B's is 2; so A wins
    expect(result.groups.map((g) => g.key)).toEqual(["A", "B"]);
  });

  it("handles mixed grouped + ungrouped items", () => {
    const items = [
      { id: "phone-booth" },
      { id: "monitor-27", subcategory: "monitors", subcategoryRank: 1 },
      { id: "task-chair", subcategory: "chairs", subcategoryRank: 1 },
      { id: "dock-tb4" },
    ];
    const result = groupItemsBySubcategory(items);
    expect(result.groups.map((g) => g.key)).toEqual(["chairs", "monitors"]);
    expect(result.ungrouped.map((i) => i.id)).toEqual(["phone-booth", "dock-tb4"]);
  });

  it("treats missing subcategoryRank as 0 within a group", () => {
    const items = [
      { id: "a", subcategory: "X", subcategoryRank: 2 },
      { id: "b", subcategory: "X" },          // rank defaults to 0
      { id: "c", subcategory: "X", subcategoryRank: 1 },
    ];
    const result = groupItemsBySubcategory(items);
    expect(result.groups[0]!.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
});
