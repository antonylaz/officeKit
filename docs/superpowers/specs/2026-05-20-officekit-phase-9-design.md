# OfficeKit — Phase 9 Design (Subcategory grouping + expanded catalog)

**Date:** 2026-05-20
**Status:** Approved by user (brainstorming session 2026-05-20)

Adds a second level of buyer choice between catalog category (the existing tabs: workstations, tech, storage, etc.) and product variant (the existing brand/model picker). Buyers can now choose what *type* of monitor (24", 27", 32", ultrawide, curved), chair (budget/mid/premium), desk, headset, or storage unit they want, then pick a brand/model within that type. Each subcategory ships with 2–3 new catalog items, and each new item ships with 2–3 brand/model variants.

## 1. Scope

### In scope

- One optional `subcategory` field added to `ItemCatalog` (plus a `subcategoryRank` sort key)
- 12 new catalog items + 5 existing items relabeled (17 total in 5 subcategory groups)
- ~30 new `ProductVariant` rows (2–3 per new item; existing variants on `monitor-27` untouched)
- Checklist UI grouped under expandable subcategory headers (`<details>` open by default)
- i18n keys for subcategory labels and new item names (sv + en)
- Self-hosted variant photos following the Phase 8 pattern (Unsplash / manufacturer CDN, downloaded into `public/variants/`)
- Integration tests for grouping logic and the new catalog data

### Explicitly out of scope (Phase 10+)

- Admin UI to CRUD subcategories or items (still seed-driven)
- Drag-and-drop reordering of items within a group
- Per-buyer or per-industry subcategory presets ("hide monitors", "default Chairs to premium")
- Variant carry-through changes — the variant picker keeps working unchanged
- Affiliate-feed sync for the new variants

## 2. Data model

```prisma
model ItemCatalog {
  // existing fields unchanged
  subcategory     String?  @map("subcategory")
  subcategoryRank Int      @default(0) @map("subcategory_rank")
}
```

- `subcategory` is free-text, not an enum — adding a new subcategory later is a seed change, not a migration.
- Items without a `subcategory` (e.g., `headset-poly-voyager-focus2`, `phone-booth`, transportation items) render flat, as today.
- `subcategoryRank` controls display order *within* a group. Group order itself follows the lowest `subcategoryRank` of any item in the group, or a deterministic fallback (alphabetical) when ranks tie.

### Why free-text, not enum

Subcategories will churn during catalog expansion (new ones added, some merged, some renamed). An enum forces a Prisma migration every time; a string column doesn't. The five initial values are documented as a TypeScript union in `src/lib/catalog-types.ts` for type safety in the UI without locking the DB.

## 3. Catalog expansion

Existing items keep their IDs and project_items references — only display names and `subcategory` change.

| Subcategory | Subcategory key | Items (existing → tier label / new) | Variants per item |
|---|---|---|---|
| Monitors | `monitors` | `monitor-27` (relabel "27-inch 4K"), `monitor-24` (new), `monitor-32` (new), `monitor-ultrawide` (new), `monitor-curved-32` (new) | 2–3 each (variant set on monitor-27 stays as-is) |
| Chairs | `chairs` | `task-chair` (relabel "Mid-tier task chair"), `task-chair-budget` (new), `task-chair-premium` (new) | 2–3 each |
| Desks | `desks` | `desk-electric` (relabel "Standard electric sit-stand"), `desk-small` (new, electric), `desk-large` (new, electric), `desk-l-shape` (new, electric) | 2 each |
| Headsets | `headsets` | `headset` (relabel "Wireless headset"), `headset-wired` (new), `headset-noise-cancel` (new) | 2 each |
| Storage | `storage-units` | `locker-8` (relabel "Personal locker (8 doors)"), `storage-cabinet` (new), `storage-shelving` (new) | 2 each |

Total: 5 existing items relabeled + 12 new items = **17 catalog items in groups**.

Variants: 0 new on `monitor-27` (already has 4), ~2.5 average × 12 new items ≈ **~30 new variants** (plus the 4 existing on monitor-27 unchanged).

The category assignments stay as today — monitors/headsets stay in `tech`, chairs/desks/storage stay in their current `ItemCategory`. Subcategory is orthogonal to category.

## 4. UI changes

### CategoryTabs content (the only changed view)

Currently renders a flat list of `ItemRow`s for the active tab. Now:

```
+----------------------------+
| MONITORS · 5         [▾]   | ← group header (<summary>)
|----------------------------|
| [ItemRow: 24"   ]          |
| [ItemRow: 27"   ]          |   ← group body
| [ItemRow: 32"   ]          |
| [ItemRow: Ultrawide]       |
| [ItemRow: Curved 32"]      |
+----------------------------+
+----------------------------+
| DOCKS & ACCESSORIES        | ← items without subcategory
|----------------------------|
| [ItemRow: Dock TB4]        |
| [ItemRow: Webcam ...]      |
+----------------------------+
```

- Group header is a `<details><summary>` pair so expand/collapse is native + accessible (keyboard, screen reader). No JS state needed.
- Defaults to **expanded** (`<details open>`) — buyer sees the full catalog on first load.
- Group header style: 11px uppercase muted label, count badge, chevron icon that rotates 90° via CSS `[open] > summary svg { transform: rotate(90deg); }`.
- Items without a subcategory render as ungrouped rows below the last group, no header. (Avoids forcing every item into a group.)

### ItemRow

Unchanged. The existing Phase 8 design (card with image, name, quantity stepper, "Choose model" button) keeps working.

### VariantPickerModal

Unchanged. New items use it identically — clicking "Choose model" on `monitor-32` opens the same modal showing that item's 2–3 variants.

## 5. Backend / API

### `GET /api/v1/catalog/items`

Existing response shape extended: each item now includes `subcategory: string | null` and `subcategoryRank: number`. Existing consumers that don't know these fields ignore them.

### `GET /api/v1/catalog/items/[id]/variants`

Unchanged — already returns variants for any item ID.

### Project summary, RFQ fanout, supplier quote builder

All unchanged. Subcategory is purely a buyer-side UI grouping; suppliers see line items the same way.

## 6. Migration

Single Prisma migration `add_subcategory_to_catalog`:
- Adds `subcategory` (nullable text) and `subcategory_rank` (int default 0) to `item_catalog`.
- Seed re-run populates the values for the 17 grouped items and inserts the 12 new ones + ~30 new variants.

Existing `project_items` rows are untouched (they reference item IDs that still exist). Buyers mid-project don't see any change beyond the existing items getting re-grouped.

## 7. Photos

12 new catalog items + ~30 new variants = ~42 new photos. Sourced from the same pool used in Phase 8 (Unsplash CC0/CC-BY, manufacturer CDNs). The existing `pnpm db:download-images` script auto-handles them — no script change needed.

If a source URL fails, the existing fallback path (generic Unsplash placeholder) kicks in. Phase 8 demonstrated the script's robustness.

## 8. i18n

~10 new keys for subcategory labels:

| Key | sv | en |
|---|---|---|
| `subcategory.monitors` | "Skärmar" | "Monitors" |
| `subcategory.chairs` | "Stolar" | "Chairs" |
| `subcategory.desks` | "Skrivbord" | "Desks" |
| `subcategory.headsets` | "Headsets" | "Headsets" |
| `subcategory.storageUnits` | "Förvaring" | "Storage" |

Plus item names for the 12 new items + relabels for the 5 existing ones (24 strings each language ≈ 48 new translation entries).

## 9. Testing

- **Unit:** `groupItemsBySubcategory(items)` — accepts a flat array, returns `{ groups: { key, label, items[] }[], ungrouped: items[] }` with stable ordering by `subcategoryRank`.
- **Integration:** seed sanity — `db.itemCatalog.findMany({ where: { subcategory: "monitors" } })` returns ≥ 5 rows; each subcategory group has the expected items.
- **Integration:** existing variant flow still works for `monitor-27` and now also for one new item (e.g., `task-chair-premium` has variants and the picker resolves them).
- **No new E2E** — the variant picker is already E2E-light tested in Phase 8. The grouping is a presentational change and doesn't warrant a Playwright spec on its own.

## 10. Risks + tradeoffs

- **Catalog churn:** five tier labels (budget/mid/premium, etc.) are subjective. Risk: a supplier disagrees with the price tier. Mitigation: default prices are best-effort; suppliers still quote their actual price in the quote builder. Tier labels are display-only.
- **Photo source for new items:** we may have to use generic stock photos when product-specific shots aren't available on Unsplash. Same pragmatic fallback as Phase 8.
- **Existing project rows:** `monitor-27` and `desk-electric` etc. keep their IDs — no `project_items` rows break. Verified by integration test.
- **Subcategory as free-text:** typos in seeds will create phantom groups (e.g., `"monitor"` vs `"monitors"`). Mitigation: a TypeScript union in `catalog-types.ts` covers the five known values; a unit test asserts every seeded item's subcategory is in that union or null.

## 11. Estimated work

~3–4 days, broken into 5 tasks:

| Task | Days |
|---|---|
| 9.1 Prisma migration + `subcategory` field + `catalog-types.ts` union | 0.5 |
| 9.2 Catalog seed expansion (12 new items + relabels + ~30 variants + photo URLs) | 1.5 |
| 9.3 `groupItemsBySubcategory` helper + unit tests | 0.5 |
| 9.4 CategoryTabs UI: grouped rendering with `<details>` headers | 0.75 |
| 9.5 i18n + integration tests + photo download verification | 0.75 |
| **Total** | **~4 days** |

## 12. Resolved decisions

| Question | Decision |
|---|---|
| Picker flow (flat / grouped / modal) | Grouped list with expandable subcategory header |
| Scope | Top 5 subcategories (~17 items + ~40 variants) |
| Variants per new item | 2–3 each |
| Group default state | Expanded |
| Existing items (task-chair, desk-electric, …) | Keep IDs, relabel display name |
| Subcategory as enum or string | String (avoids migration churn) |
| Default sort | `subcategoryRank` then alphabetical |
| Admin CRUD | Out of scope — seed only |

## 13. Next step

Hand off to writing-plans for the implementation plan.
