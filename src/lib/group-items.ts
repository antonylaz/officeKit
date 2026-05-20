interface GroupableItem {
  id: string;
  subcategory?: string | null;
  subcategoryRank?: number | null;
}

export interface ItemGroup<T> {
  key: string;                      // the subcategory string
  items: T[];                       // sorted by subcategoryRank ascending, ties by id
  rank: number;                     // lowest subcategoryRank in the group; drives group order
}

export interface GroupedItems<T> {
  groups: ItemGroup<T>[];           // sorted by rank ascending, ties by key alphabetical
  ungrouped: T[];                   // items with no subcategory; preserve input order
}

export function groupItemsBySubcategory<T extends GroupableItem>(items: T[]): GroupedItems<T> {
  const buckets = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const item of items) {
    const key = item.subcategory;
    if (key) {
      const bucket = buckets.get(key) ?? [];
      bucket.push(item);
      buckets.set(key, bucket);
    } else {
      ungrouped.push(item);
    }
  }

  const groups: ItemGroup<T>[] = [];
  for (const [key, bucketItems] of buckets) {
    bucketItems.sort((a, b) => {
      const ra = a.subcategoryRank ?? 0;
      const rb = b.subcategoryRank ?? 0;
      if (ra !== rb) return ra - rb;
      return a.id.localeCompare(b.id);
    });
    const lowestRank = bucketItems.reduce(
      (min, it) => Math.min(min, it.subcategoryRank ?? 0),
      Number.POSITIVE_INFINITY,
    );
    groups.push({ key, items: bucketItems, rank: Number.isFinite(lowestRank) ? lowestRank : 0 });
  }

  groups.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.key.localeCompare(b.key);
  });

  return { groups, ungrouped };
}
