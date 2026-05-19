# OfficeKit — Phase 4 Design (Quote Comparison + Ordering)

**Date:** 2026-05-19
**Author:** Antonio Lazeski (with Claude)
**Status:** Approved by "finish whole project" blanket authorization
**Source spec:** `officekit-spec.pdf` v1.0, sections 4.1 step 7–10, 4.2 step 6, 6.2, 6.3
**Parent designs:** Phase 0–2 + Phase 3

This design covers Phase 4: buyers see their three quotes side-by-side, pick one, and place an order. Suppliers see won orders and transition fulfillment status. Payment is deferred to Phase 5 — Phase 4 creates Order rows with `stripePaymentIntentId = null`.

## 1. Scope

### In scope

- **Buyer quote comparison** at `/[locale]/projects/[id]/quotes`: three quote cards side-by-side with supplier name, delivery time, total inc. VAT, perks, "Best value" badge on cheapest, "Sustainability leader" badge on highest used-mode share.
- **Quote pick** flow: clicking "Choose [supplier]" opens a modal asking for billing details, delivery address (defaults to project city), delivery window. "Place order" creates an Order row, transitions the winning RFQ to `won`, others to `lost`, project to `ordered`. Sends confirmation emails (buyer + winning supplier; the two losing suppliers also get a "you weren't picked" email).
- **Lost-reason capture**: optional free-text field on the quote-decline UI ("Why are you picking another?"). Stored on the rejected RFQs.
- **Order placement WITHOUT payment**: Order created with `paymentMethod` set to chosen value (card/klarna_invoice — both placeholders for Phase 5), `stripePaymentIntentId = null`. Phase 5 will wire actual payment.
- **Supplier order fulfillment status**: supplier sees won orders at `/[locale]/supplier/orders`, can transition status: Confirmed → In production → Shipped → Delivered.
- **48h supplier cancel window**: supplier can cancel an order within 48 hours of placement (per spec section 11.4). Cancel sets order status to `cancelled`, releases the rfq back to `quoted` so buyer can pick another, notifies buyer via email.
- **Order tracking for buyer** at `/[locale]/orders/[id]`: shows current status, supplier contact, items, delivery window. Replaces the empty `/orders` stub from Phase 1.
- **Buyer dashboard `/orders`**: now lists all the buyer's orders (was empty state in Phase 1).
- **i18n**: all new strings in `sv.json` + `en.json`.

### Out of scope (deferred)

| Item | Phase |
|------|-------|
| Stripe payment intents (`payment_intent.succeeded`) | 5 |
| Klarna invoice flow | 5 |
| Commission split + supplier payouts | 5 |
| Refund handling | 5 |
| Supplier CSV catalog upload | follow-up |
| Admin manual order intervention UI | 6 |
| Order export | 6 |
| Real-time status updates (WebSocket) | never |

## 2. Architecture

Same Next.js app. No new infrastructure. Two new email templates, ~5 new pages, ~5 new components, ~6 new API endpoints. Order state machine lives in `src/server/orders.ts`.

The Phase 3 `scripts/simulate-buyer-pick.ts` is **replaced** by the real `POST /api/v1/projects/:id/orders` endpoint that does the same RFQ transitions plus creates an Order row.

## 3. Data model deltas

One migration adding three columns:

```prisma
model Rfq {
  // existing fields
  lostReason   String?   @map("lost_reason")  // optional buyer-provided reason
}

model Order {
  // existing fields
  trackingNumber  String?   @map("tracking_number")   // shipping carrier tracking (free-form)
  deliveredAt     DateTime? @map("delivered_at")
  cancelledAt     DateTime? @map("cancelled_at")
  cancelReason    String?   @map("cancel_reason")
}
```

The Order row's `stripePaymentIntentId` and `stripeTransferId` stay nullable (already in schema from Phase 0). They'll be populated in Phase 5.

## 4. Routes

### Buyer

```
src/app/[locale]/projects/[id]/
├── quotes/page.tsx          # NEW — side-by-side quote comparison
├── quotes/[quoteId]/
│   └── confirm/page.tsx     # NEW — order placement form (billing, delivery)
src/app/[locale]/orders/
├── page.tsx                 # MODIFY — real list, replaces empty stub
└── [id]/page.tsx            # NEW — order detail with status timeline
```

### Supplier

```
src/app/[locale]/supplier/
├── orders/page.tsx          # NEW — won orders list
└── orders/[id]/page.tsx     # NEW — order detail with status transitions + cancel button
```

### API

```
GET    /api/v1/projects/:id/quotes              # buyer: list submitted quotes for project
POST   /api/v1/projects/:id/orders              # buyer: pick a quote, place order
GET    /api/v1/orders/:id                       # buyer: order detail
GET    /api/v1/supplier/orders                  # supplier: won orders list
GET    /api/v1/supplier/orders/:id              # supplier: order detail
PATCH  /api/v1/supplier/orders/:id/status       # supplier: transition status
POST   /api/v1/supplier/orders/:id/cancel       # supplier: cancel within 48h
```

## 5. Quote comparison UI (buyer)

Page at `/[locale]/projects/[id]/quotes`:

- Server-renders all submitted quotes (`Quote.submittedAt != null`) for the project's RFQs.
- Layout: three quote cards in a row (responsive: stacks on mobile).
- Each card shows:
  - Supplier name + location
  - Total inc. VAT (large, prominent)
  - Delivery window (from supplier's `coverageAreas` + a hardcoded ~7d offset for v1; real lead times Phase 5+)
  - Perks list (chips)
  - "Best value" badge if cheapest
  - "Sustainability leader" badge if highest used-mode share (count of `used` lines / total lines)
  - "Choose [Supplier]" CTA — links to `/projects/[id]/quotes/[quoteId]/confirm`
  - "Request revisions" link → mailto: supplier (placeholder; in-app messaging is out of scope)
  - "Decline all" link at the bottom → opens a small modal asking for optional reason, then navigates back

If fewer than 3 quotes submitted (some suppliers haven't responded), still show what's available with a banner "2 of 3 suppliers responded — you can still proceed."

## 6. Order placement flow

`/[locale]/projects/[id]/quotes/[quoteId]/confirm`:

Form fields:
- Billing details: company name (pre-filled from project's company), org number, address (street, postal, city, country)
- Delivery address (defaults to project's city, can override)
- Preferred delivery window: start date, end date
- Payment method: radio (card / Klarna 30-day invoice — for Phase 4 both are placeholders; Phase 5 wires the actual flow)
- "Place order" CTA

On submit `POST /api/v1/projects/:id/orders` with `{ quoteId, billing, deliveryAddress, deliveryWindowStart, deliveryWindowEnd, paymentMethod }`:

Server logic in `src/server/orders.ts`:

```ts
export async function placeOrder(input: PlaceOrderInput) {
  const session = await auth();
  const project = await getAuthorizedProject(input.projectId);
  if (!project) throw new Error("not_authorized");
  const quote = await db.quote.findFirst({
    where: { id: input.quoteId, rfq: { projectId: input.projectId }, submittedAt: { not: null } },
    include: { rfq: true },
  });
  if (!quote) throw new Error("quote_not_found_or_unsubmitted");

  // 6% commission on total
  const commissionRate = 0.06; // could read from rfq.supplier.commissionRate
  const commissionAmount = Math.round(quote.totalAmount * commissionRate);
  const payoutAmount = quote.totalAmount - commissionAmount;

  return db.$transaction(async (tx) => {
    // Update billing on company if changed
    await tx.company.update({ where: { id: project.companyId }, data: { name: input.billing.companyName, orgNumber: input.billing.orgNumber, address: input.billing.address } });

    const order = await tx.order.create({
      data: {
        projectId: input.projectId,
        quoteId: quote.id,
        supplierId: quote.rfq.supplierId,
        companyId: project.companyId,
        status: "confirmed",
        totalAmount: quote.totalAmount,
        commissionAmount,
        payoutAmount,
        deliveryAddress: input.deliveryAddress,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
        paymentMethod: input.paymentMethod,
        // stripePaymentIntentId stays null until Phase 5
      },
    });

    // RFQ state transitions
    await tx.rfq.update({ where: { id: quote.rfqId }, data: { status: "won", decidedAt: new Date() } });
    await tx.rfq.updateMany({
      where: { projectId: input.projectId, NOT: { id: quote.rfqId }, status: { in: ["sent", "viewed", "quoted"] } },
      data: { status: "lost", decidedAt: new Date(), lostReason: input.lostReasonForLosers ?? null },
    });
    await tx.project.update({ where: { id: input.projectId }, data: { status: "ordered" } });

    return order;
  });
}
```

After the order is created, the route handler fires three emails (best-effort, errors logged not thrown):
1. Buyer confirmation: "Order placed, supplier confirms within 24h"
2. Winning supplier: "Congratulations — order placed"
3. Losing suppliers: "Quote not selected" (with optional lost-reason from buyer)

## 7. Supplier order management

`/[locale]/supplier/orders/[id]`:
- Header: company name, order ID, status badge
- Status timeline (vertical): Confirmed (auto, current) → In production → Shipped → Delivered
- "Mark as [next status]" CTA progresses the timeline
- Optional `trackingNumber` field at "Shipped" transition
- 48h-cancel banner: "You can cancel this order until [timestamp]. After that, the buyer's payment is committed."
- Cancel button (visible only within the 48h window): opens a modal asking for reason

`PATCH /api/v1/supplier/orders/:id/status` body `{ status: "in_production" | "shipped" | "delivered", trackingNumber? }`:
- Validates status transition is monotonically forward (no skipping or reverting)
- Sets `deliveredAt` when status becomes `delivered`
- (Phase 5 will then trigger payout release on `delivered`)

`POST /api/v1/supplier/orders/:id/cancel` body `{ reason }`:
- Allowed only if `now - createdAt < 48h` AND status != delivered
- Sets order status to `cancelled`, `cancelledAt`, `cancelReason`
- Reverts the winning RFQ to `quoted` (so buyer can re-pick)
- Reverts losing RFQs to `quoted` too (they could re-win)
- Resets project status to `quotes_received`
- Sends buyer an email with explanation + link back to quote comparison

## 8. Buyer order tracking

`/[locale]/orders` (was empty stub): server-renders list of `orders` where `company.createdByUserId = session.user.id`. Each row: order ID (short), supplier name, status, total, delivery window.

`/[locale]/orders/[id]`: detail view with:
- Status timeline (matches supplier's)
- Supplier contact info (name, email)
- Items list from the quote
- Delivery address + window
- Buyer cannot modify status — read-only

## 9. Lost-reason capture

The lost-reason is optional. UX:
- On the quote-comparison page, "Decline all" opens a modal with a text field "Why are you declining?" (placeholder examples shown). Submit clears all RFQs to `lost` with that reason on each.
- On order placement (picking one), no reason is captured for the losers — they just see "Not selected" in their inbox. Optional field on the confirm form ("Tell the other suppliers what tipped your decision (optional)") sets the same reason on all losers.

## 10. Badges

**Best value**: lowest `Quote.totalAmount` among submitted quotes for the project.

**Sustainability leader**: highest count of `QuoteLine.mode = "used"` / total lines. Tie-breaker: highest absolute used count.

Edge cases:
- Only one quote submitted → both badges go on it.
- Tied "Best value" → first by `submittedAt` ascending.
- All lines new across all quotes → no "Sustainability leader" badge shown.

## 11. Testing

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | Badge logic (`pickBestValue`, `pickSustainabilityLeader`), commission math, state-machine validators (allowed transitions, 48h cancel window) |
| Integration | Vitest | Full order placement flow: buyer picks quote → Order created → RFQs transitioned → all 3 emails attempted → order detail GET returns expected data |
| E2E | Playwright | Buyer picks a quote, fills confirm form, sees confirmation page. Reuse the integration-seeded test data. |

## 12. i18n

~30 new keys across `buyer.quotes.*`, `buyer.confirm.*`, `buyer.orders.*`, `supplier.orders.*`, `email.*`. Both `sv.json` and `en.json` updated in parallel.

## 13. Resolved design decisions

| Question | Decision |
|----------|----------|
| Stripe in Phase 4? | No — defer to Phase 5. Orders created with `paymentMethod` set but `stripePaymentIntentId = null`. |
| Klarna in Phase 4? | No — defer to Phase 5 (user requested Klarna in Phase 5). |
| Lost-reason mandatory? | No — optional free text. |
| CSV catalog upload? | Deferred. Suppliers quote at catalog defaults for v1. |
| 48h cancel window? | Yes — per spec section 11.4. |
| Quote validity period? | 14 days — matches Phase 3 default. |
| Mobile responsive comparison view? | Cards stack on screens <768px. |
| Email failures block placement? | No — best-effort, logged. |

## 14. Estimated timeline

| Slice | Days |
|-------|------|
| Schema migration + state-machine helpers (TDD) | 1 |
| Quote comparison page + badge logic (TDD) | 1.5 |
| Order placement form + endpoint | 1.5 |
| Buyer order list + detail | 1 |
| Supplier order list + detail + status transitions | 1.5 |
| Supplier cancel endpoint + buyer notification | 1 |
| Emails (3 templates) | 0.5 |
| i18n + integration/E2E tests | 1 |
| **Total** | **~9 days = ~1.8 weeks** |

## 15. Next step

Hand off to `superpowers:writing-plans` for the implementation plan.
