import { describe, expect, it } from "vitest";
import { getRoomsForIndustry } from "@/lib/room-presets";

describe("room-presets", () => {
  it("returns at least 4 rooms for each industry", () => {
    for (const ind of ["it", "finance", "sales", "law"] as const) {
      expect(getRoomsForIndustry(ind).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("rooms have non-overlapping rectangles in the law preset", () => {
    const rooms = getRoomsForIndustry("law");
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i]!, b = rooms[j]!;
        const overlaps = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlaps).toBe(false);
      }
    }
  });
});
