# OfficeKit — Phase 8 Design (Rich Catalog: Variants + Photos + Used-Item Deep Links + Transportation)

**Date:** 2026-05-20
**Status:** Approved by user direction "brainstorm and build Phase 8"

Upgrades the buyer experience from a generic checklist with emojis into a real shopping experience: each catalog item now has multiple specific product variants (e.g., "27\" monitor" → Dell U2723QE, LG 27UP850-W, Samsung S27A800UJN, …), each variant has a real photo, and clicking "find used" deep-links to Blocket / Tradera with a pre-filled search. Also adds transportation as a first-class catalog category with one or more 3rd-party logistics suppliers onboarded.

## 1. Scope

### In scope

- New `ProductVariant` table with image URL, manufacturer, model, specs JSON, priceNew/priceUsed, and deep-link search queries for Blocket + Tradera
- `ProjectItem.variantId` and `QuoteLine.variantId` (nullable — buyer can stay at "generic" level)
- Variant picker modal on the checklist UI — click a row to see 3–6 variants as cards with photo + spec + price + "find used on Blocket" + "find used on Tradera" links
- Variant carries through to quote builder: supplier sees which variant the buyer wants
- `transportation` added to `ItemCategory` enum
- `Supplier.serviceTypes String[]` defaulting to `["furniture"]`; transportation suppliers have `["transportation"]`
- RFQ fanout extended: when the project's items include transportation, fanout includes at least one transportation supplier alongside furniture suppliers
- Seed: ~15 catalog items × 4 variants = ~60 variants (stock photos from Unsplash CC0/CC-BY initially); 4 transportation items; 2 transportation suppliers (Bring Demo, PostNord Demo) — fictional/demo names to avoid trademark issues
- Variant images served from Vercel Blob or `public/variants/` static assets (initial: static `public/` for simplicity)
- i18n keys for the variant picker UI and transportation labels (~15 new keys)

### Explicitly out of scope (future work)

- Affiliate feed integration (Dustin / Komplett / Inet / IKEA Business) — schema is forward-compatible (`sourceFeedId`, `lastSyncedAt` columns reserved), but no sync code in Phase 8
- Live rate API integration with Bring or PostNord Shipping Guide — transportation suppliers quote manually, same as furniture suppliers
- Admin UI to CRUD variants — variants are seeded; admin can edit raw via Prisma Studio for now
- PriceRunner / Prisjakt integration — no public API; future partnership work
- "Buy used directly through OfficeKit" — Blocket/Tradera deep links open in a new tab; OfficeKit doesn't broker the second-hand transaction
- Mobile-optimized variant picker — uses the same modal; should still be usable but not specifically tuned

## 2. Architecture

No new infrastructure. One Prisma migration (`product_variants` table + enum value + column additions). Photos served as static assets from `public/variants/<item-slug>/<variant-slug>.jpg`. Initial photos sourced from Unsplash with attribution stored as a comment in the seed file.

## 3. Data model deltas

```prisma
model ProductVariant {
  id                    String   @id @default(uuid())
  itemId                String   @map("item_id")
  item                  ItemCatalog @relation(fields: [itemId], references: [id])
  name                  String                              // e.g. "Dell UltraSharp U2723QE"
  manufacturer          String                              // e.g. "Dell"
  sku                   String?                             // e.g. "U2723QE"
  imageUrl              String   @map("image_url")          // /variants/monitor-27/dell-u2723qe.jpg
  specs                 Json     @default("{}")             // { resolution: "3840x2160", refresh: "60Hz" }
  priceNewOre           Int      @map("price_new_ore")
  priceUsedDefaultOre   Int?     @map("price_used_default_ore")
  manufacturerUrl       String?  @map("manufacturer_url")
  blocketSearchQuery    String?  @map("blocket_search_query")    // "Dell U2723QE 27 4K"
  traderaSearchQuery    String?  @map("tradera_search_query")
  displayOrder          Int      @default(0) @map("display_order")
  active                Boolean  @default(true)
  sourceFeedId          String?  @map("source_feed_id")     // future affiliate sync
  lastSyncedAt          DateTime? @map("last_synced_at")
  projectItems          ProjectItem[]
  quoteLines            QuoteLine[]
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@index([itemId, displayOrder])
  @@map("product_variants")
}

model ProjectItem {
  // existing fields
  variantId  String?  @map("variant_id")
  variant    ProductVariant? @relation(fields: [variantId], references: [id])
}

model QuoteLine {
  // existing fields
  variantId  String?  @map("variant_id")
  variant    ProductVariant? @relation(fields: [variantId], references: [id])
}

model Supplier {
  // existing fields
  serviceTypes  String[]  @default(["furniture"]) @map("service_types")
}

enum ItemCategory {
  workstations
  tech
  meeting
  storage
  lounge
  kitchen
  transportation   // NEW
}
```

## 4. Checklist UI changes

Each item row in `ItemRow.tsx` gets a new control: a "Choose model" button. Its label is either "Choose model" (no variant picked yet) or `{manufacturer} {sku || name}` (when a variant is picked, shown alongside a tiny thumbnail of the variant image).

Clicking opens `VariantPickerModal`:
- Header: item name + description
- Grid of variant cards (responsive, 3-up on desktop, 1-up on mobile):
  - Top: product image (200×150)
  - Manufacturer + model (16px, bold)
  - Key specs (2–3 lines, 12px muted)
  - Price (new, large terracotta) + "or used from ~XXX kr" (small, mute)
  - "Pick this →" button (terracotta)
  - "Find used on Blocket →" link (small, outline, opens Blocket search in new tab) — only shown when `blocketSearchQuery` is set
  - "Find used on Tradera →" link (same)
- "Stay generic" link at the bottom — picks no variant (uses catalog defaults)

When a variant is selected:
- The item row's quantity stepper now applies to that variant
- The row's unit price is shown from the variant (not the catalog default)
- The new/used toggle still works; the row's unit price reflects new or used price of the chosen variant

If the row's quantity is set without a variant ever being picked: behaves exactly as today (uses catalog defaults). This preserves backward compatibility.

## 5. Transportation flow

Buyer adds transportation items (e.g., "Inside delivery + assembly") to the checklist like any other item. The RFQ fanout function, currently in `src/server/rfq-fanout.ts`, is extended:

```
- Gather all furniture suppliers matching the project's vertical (existing behavior)
- Pick 3 furniture suppliers (existing behavior)
- If the project's items include any with item.category === "transportation":
  - Find suppliers where serviceTypes contains "transportation"
  - Pick 1 (closest by coverage area, or random)
  - Add it to the chosen set, making 4 RFQs total
```

Transportation suppliers quote like furniture suppliers — they see the project, they see the transportation line items (and only need to quote those — the supplier UI already filters by what they want to quote on).

In the buyer's quote comparison view (Phase 4), transportation quotes appear as a 4th card with a "Logistics" badge instead of "Furniture supplier". Buyer can pick a furniture quote AND accept the transport quote independently — they're not mutually exclusive.

Implementation: extend `placeOrder` to accept an optional `transportQuoteId` alongside the primary `quoteId`. If both are set, two Order rows are created — one furniture, one transportation. Both follow the same fulfillment state machine. Simpler interim: keep order placement to one quote at a time, and let the buyer place the furniture order first, then optionally place a transport order separately. (Phase 8 ships the simpler interim; multi-order placement is a follow-up.)

## 6. Seed data

`prisma/variants-data.ts` exports a `VARIANTS` array. Stock photos sourced from Unsplash (CC0 / CC-BY — attribution comment per photo). Manufacturer references use generic descriptions where trademark might be sensitive (e.g., "27-inch IPS 4K monitor, Dell-class" rather than naming the product). For widely recognized models with publicly available manufacturer marketing material, we use the real model name + an Unsplash representative photo. Initial coverage:

- `desk-electric` → 4 variants (sit-stand desks at different price tiers)
- `task-chair` → 4 variants (RH Logic class, Herman Miller Aeron class, IKEA Markus, used Steelcase)
- `monitor-27` → 4 variants (Dell U2723QE class, LG 27UP850 class, BenQ PD2700U class, Samsung S27A800UJN class)
- `monitor-arm` → 3 variants
- `headset` → 3 variants
- `meeting-table-6` → 3 variants
- `phone-booth` → 3 variants
- `coffee-machine` → 3 variants
- `sofa-3` → 3 variants
- `armchair` → 3 variants
- 5 more items each with 3 variants

Roughly 50 variants total. Transportation items:
- `delivery-local` "Local delivery (Stockholm ≤10 km)"
- `delivery-inside` "Inside delivery + carry up"
- `delivery-assembly` "Inside delivery + assembly"
- `pickup-disposal` "Old furniture pickup & disposal"

No variants for transportation items in Phase 8.

Two transportation supplier rows added to the seed:
- "Bring Demo AB" — `serviceTypes: ["transportation"]`, coverageAreas: ["Stockholm", "Göteborg", "Malmö"]
- "PostNord Demo AB" — `serviceTypes: ["transportation"]`, coverageAreas: ["Stockholm"]

(Demo-tagged names to avoid trademark concerns, matching Phase 0–2 convention.)

## 7. Images strategy

For Phase 8: stock photos in `public/variants/<item-slug>/<variant-slug>.{jpg|webp}`. Each photo is referenced in `variants-data.ts` with an attribution comment:

```ts
{
  id: "monitor-27-dell-u2723qe",
  // Photo: Unsplash @userhandle (https://unsplash.com/photos/abc123) — CC0
  imageUrl: "/variants/monitor-27/dell-u2723qe.jpg",
  ...
}
```

Initially, the implementer creates placeholder image files (e.g., uses curl to fetch from Unsplash + commits as static assets). For v1, image quality is "good enough" — not pixel-perfect for every product. Future work: supplier admin UI to upload real product photos.

A `public/variants/_placeholder.jpg` exists as a fallback if `imageUrl` is missing.

## 8. Deep links

Blocket: `https://www.blocket.se/annonser/hela_sverige?q={encodeURIComponent(blocketSearchQuery)}`
Tradera: `https://www.tradera.com/search?q={encodeURIComponent(traderaSearchQuery)}`

Both open in a new tab (`target="_blank" rel="noreferrer noopener"`). No tracking, no scraping — pure deep linking.

## 9. API changes

New endpoint:
- `GET /api/v1/catalog/items/[id]/variants` — returns variants for a single item

Modified endpoints:
- `POST /api/v1/projects/:id/items` and `PATCH /api/v1/projects/:id/items/:lineId` — accept optional `variantId` in body
- Project summary computation in `src/server/project-summary.ts` — when an item has a variantId, use the variant's price instead of the catalog default

## 10. Testing

- Unit: variant price resolution (variant price wins over catalog default; falls back gracefully if variant deleted), Blocket/Tradera URL builder, transportation fanout selection logic
- Integration: create project → pick variant → place order → quote line has variantId
- E2E: out of scope (variant UI is hard to E2E without real Stripe + DB seed prep)

## 11. i18n

~15 new keys:
- `checklist.chooseModel`: "Välj modell" / "Choose model"
- `checklist.staysGeneric`: "Stanna generisk" / "Stay generic"
- `variantPicker.title`: "Välj variant" / "Choose variant"
- `variantPicker.pickThis`: "Välj denna" / "Pick this"
- `variantPicker.findUsedBlocket`: "Hitta begagnat på Blocket" / "Find used on Blocket"
- `variantPicker.findUsedTradera`: "Hitta begagnat på Tradera" / "Find used on Tradera"
- `variantPicker.usedFrom`: "eller begagnat från ~{price}" / "or used from ~{price}"
- `variantPicker.specs`: "Specifikationer" / "Specifications"
- `checklist.tabs.transportation`: "Transport & logistik" / "Transport & logistics"
- `quotes.badges.logistics`: "Logistik" / "Logistics"
- `supplier.serviceType.furniture`: "Möbler" / "Furniture"
- `supplier.serviceType.transportation`: "Transport" / "Transportation"
- 3 more for tooltips and error states

## 12. Risk + tradeoffs (explicit)

- **Image rights**: Unsplash CC0/CC-BY is safe. Hotlinking manufacturer photos is NOT safe — we host the images ourselves. If a brand objects, swap to generic representative photos.
- **Variant churn**: real product lineups change every 6–12 months (Dell discontinues a model). Phase 8 has no automated refresh. Variants get stale; admin should periodically review. Future affiliate-feed integration solves this.
- **Blocket / Tradera TOS**: deep-linking to public search URLs is generally fair use across major jurisdictions; not scraping; not building a derivative product. Should be safe.
- **Backward compatibility**: existing project_items rows have `variantId = null` after migration — they keep working with catalog defaults. No data loss.

## 13. Estimated work

~1.5 weeks, broken into 5 tasks:

| Task | Days |
|------|------|
| 8.1 Schema migration + variants-data seed (~50 variants, photos curated) | 2.5 |
| 8.2 GET /catalog/items/[id]/variants endpoint + price resolution updates | 0.5 |
| 8.3 Variant picker modal UI + ItemRow integration | 2 |
| 8.4 Transportation seed (4 items + 2 suppliers) + RFQ fanout extension | 1 |
| 8.5 i18n keys + tests + E2E sanity | 1.5 |
| **Total** | **~7.5 days** |

## 14. Resolved decisions

| Question | Decision |
|----------|----------|
| Image source for v1 | Unsplash (CC0/CC-BY) hosted as static assets in `public/variants/` |
| Variant required? | Optional — buyer can stay at "generic" level |
| Number of variants per item | 3–4 for ~15 items; not all items get variants in Phase 8 |
| Live API integration | None in Phase 8 — schema reserves columns for future affiliate sync |
| Buy-used UI | Deep link to Blocket + Tradera search; opens in new tab |
| Transportation suppliers | Onboarded as regular Supplier rows with `serviceTypes: ["transportation"]` |
| Multi-quote ordering (furniture + transport in one transaction) | Out of scope for Phase 8 — buyer places furniture order, then optionally a separate transport order |
| Admin variant CRUD UI | Out of scope — variants edited via Prisma Studio or seed re-run |

## 15. Next step

Hand off to writing-plans for the implementation plan.
