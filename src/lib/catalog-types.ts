export const SUBCATEGORY_KEYS = [
  "monitors",
  "chairs",
  "desks",
  "headsets",
  "storage-units",
] as const;

export type SubcategoryKey = (typeof SUBCATEGORY_KEYS)[number];

export function isSubcategoryKey(value: string | null | undefined): value is SubcategoryKey {
  return value != null && (SUBCATEGORY_KEYS as readonly string[]).includes(value);
}
