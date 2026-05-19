# OfficeKit — Phase 5 Design (Payments + Payouts)

**Date:** 2026-05-19
**Status:** Approved (blanket "finish whole project" authorization)
**Source spec:** sections 4.1 step 8 (payment), 4.2 steps 6-7, 6.6 webhooks, 9.3 security
**Mode:** Stub-first — all Stripe code gated behind `STRIPE_ENABLED` env flag. Returns mock success when disabled; real API when keys present.

## 1. Scope

### In scope

- **Stripe SDK** installed + helper at `src/lib/stripe.ts` that lazily returns a `Stripe` client when `STRIPE_ENABLED=true` and the secret key is set; returns `null` otherwise.
- **Card payments via Stripe Payment Intents** — on order placement, create a PaymentIntent for the order total. Real or mocked depending on flag.
- **Klarna integration via Stripe** — Stripe's `klarna` payment_method_type is a first-class option for Sweden. Same PaymentIntent flow with `payment_method_types: ["card", "klarna"]` and PM selection from the buyer's confirm form choice (`card` or `klarna_invoice`).
- **Stripe webhook handler** at `/api/webhooks/stripe` — handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`. Signature verification when keys present; skips when stubbed.
- **Stripe Connect Express** onboarding for suppliers — admin or supplier-self triggers account creation, supplier redirected to Stripe to complete KYC. Express keeps Stripe-hosted dashboard while OfficeKit retains the marketplace relationship.
- **Commission split + payout transfer** — on order status transition to `delivered`, fire a Stripe Transfer for `payoutAmount` to the supplier's connected account.
- **Supplier payouts dashboard** at `/[locale]/supplier/payouts` — list of payouts (pending / processing / paid) with order linkage.
- **Order status `paid`** transition wired up via webhook handler.
- **Refunds**: minimal — `POST /api/v1/admin/orders/:id/refund` (admin-only, used in Phase 6 admin UI). Implement the endpoint but no UI yet.
- **i18n**: ~15 new keys for payouts + payment status messages.

### Out of scope

- Multi-currency (everything in SEK)
- Recurring payments / subscriptions
- 3D Secure custom UI (Stripe handles it)
- Pre-authorization holds (auth+capture is one shot at placement)
- Custom payout schedules (use Stripe default daily)
- Tax handling beyond what Stripe + spec defines (25% Swedish VAT is already on the order, Stripe processes the gross)

## 2. Architecture

Stripe Connect Express marketplace model:
- OfficeKit's platform Stripe account holds the API key
- Each supplier has a `Supplier.stripeAccountId` (already in schema from Phase 0)
- Buyer pays the platform account at order placement
- Platform transfers `payoutAmount` to supplier's connected account on delivery
- Stripe collects fees from the platform balance

Stub mode: a single env flag `STRIPE_ENABLED=true` toggles real API. When false, `getStripe()` returns `null` and all callers fall back to mock IDs (`pi_stub_<uuid>`, `tr_stub_<uuid>`, etc.).

## 3. Data model deltas

No schema changes — `Order.stripePaymentIntentId`, `Order.stripeTransferId`, `Supplier.stripeAccountId` were already added in Phase 0.

## 4. Routes

```
src/app/[locale]/
├── supplier/
│   ├── payouts/page.tsx              # NEW — list payouts
│   └── settings/stripe/page.tsx      # NEW — Stripe Connect onboarding entry
src/app/api/v1/
├── stripe/
│   ├── connect/onboard/route.ts      # NEW — POST: create account link, return URL
│   └── connect/refresh/route.ts      # NEW — GET: re-create link if Stripe redirected back unfinished
├── orders/[id]/payment-intent/route.ts  # NEW — POST: create or retrieve PI (called from buyer confirm)
└── admin/orders/[id]/refund/route.ts # NEW — POST: refund full order (admin only)
src/app/api/webhooks/stripe/route.ts  # NEW — POST: handle Stripe events
```

## 5. Stripe helper

`src/lib/stripe.ts`:

- `stripeEnabled`: `process.env.STRIPE_ENABLED === "true" && !!process.env.STRIPE_SECRET_KEY`
- `getStripe()`: returns a memoized `Stripe` instance or `null`
- `mockId(prefix)`: returns `${prefix}_stub_${randomBytes(8).toString("hex")}` — used in stub mode

## 6. Order placement integration

Modify `src/server/orders.ts` `placeOrder()`:

After creating the Order row, if `stripeEnabled`:
- Create a PaymentIntent: `amount: totalAmount, currency: "sek", payment_method_types: ["card", "klarna"], metadata: { orderId, projectId, supplierId }, transfer_data: { destination: supplier.stripeAccountId, amount: payoutAmount }`
- Store `paymentIntent.id` on the Order

If stubbed:
- Store `mockId("pi")` on the Order
- Synthesize a "successful payment" webhook by directly transitioning Order to `paid` after a 1s delay (in dev only) — actually no, simpler: keep order in `confirmed`, mark Order's `paymentMethod` value as authoritative. The `paid` status only fires from webhook in real mode.

Looking again — the existing flow has Order in `confirmed` after placement. With Stripe enabled, the buyer is redirected to a Stripe Checkout / Elements page to actually pay before the PaymentIntent succeeds. So Phase 5 changes the placement UX:

**New flow:**
1. Buyer fills confirm form → POST /api/v1/projects/:id/orders
2. Server creates Order (status=confirmed), creates PaymentIntent
3. Returns `{ orderId, clientSecret }` to client
4. Client redirects to `/orders/[id]/pay` (NEW page) with Stripe Elements
5. Buyer completes payment in Stripe Elements (card or Klarna)
6. On success, redirect to `/orders/[id]` confirmation
7. Stripe webhook fires → server marks order status as `paid` (or keeps `confirmed` and updates Order with `paidAt`?)

Hmm, but order status enum doesn't have a "pending payment" vs "paid" distinction beyond `paid` being terminal. Let me keep it simple: order is in `confirmed` until webhook fires `payment_intent.succeeded`, then briefly in `paid`, then supplier transitions through fulfillment as before.

Wait actually the existing state machine had: confirmed → in_production → shipped → delivered → paid. That's odd — `paid` was at the end. Re-reading the source spec section 4.2 step 6: "On 'Delivered' + buyer confirmation, OfficeKit releases payment to supplier minus 6% commission." So `paid` = payout fired = supplier was paid.

So:
- Buyer pays at placement (PaymentIntent succeeds → order is paid by buyer, but supplier hasn't received money yet)
- Order moves through confirmed → in_production → shipped → delivered
- On delivered, Transfer fires → supplier gets paid → order status moves to `paid`? Or stays `delivered` and we use a separate `payoutAt` field?

Let me check schema: Order has `stripeTransferId` (nullable), and OrderStatus enum is `confirmed | in_production | shipped | delivered | paid | cancelled`. Phase 4's state machine I implemented goes: confirmed → in_production → shipped → delivered → (end). The `paid` status was unused in Phase 4.

For Phase 5: I'll add `paid` to the allowed transitions: `delivered → paid` happens when the Transfer succeeds. So the state machine adds one row.

But for stub mode I need a different signal that payment succeeded. Simplest: 
- Stub mode: `placeOrder` immediately sets a fake `paidAt` (via a new field) or just sets PaymentIntent ID and skips the payment-elements page entirely (redirect straight to `/orders/[id]`)
- Real mode: standard PaymentIntent flow

In stub mode, the order is "paid" for our purposes from placement onward. We won't show the user a payment screen; just go straight to confirmation. This means the `OrderConfirmForm` POST returns either:
- Stub mode: `{ orderId, paymentStubbed: true }` → redirect to `/orders/[id]`
- Real mode: `{ orderId, clientSecret }` → redirect to `/orders/[id]/pay`

OK, design is getting nuanced. Let me lock it in:

**Order state machine extended:**
- Add `paid` to allowed: `delivered → paid` only
- Add separate `Order.paidAt` field (nullable)? Actually no — `Order.stripeTransferId` becoming non-null is the signal. Don't need extra column.

**Supplier transitions** stay the same; payout is automatic on delivered.

OK let me wrap up the design.

## 7. Webhook handler

`/api/webhooks/stripe`:
- Validates signature with `STRIPE_WEBHOOK_SECRET` (real mode)
- Switches on event type:
  - `payment_intent.succeeded` → no order status change (order already confirmed); store `paidAt` on order? Or just log.
  - `payment_intent.payment_failed` → set order status to cancelled, log
  - `transfer.created` → set Order.stripeTransferId
  - `transfer.paid` (if available) → set order status to `paid`
- Returns 200 quickly

In stub mode, the webhook endpoint exists but never receives events; payouts are simulated.

## 8. Klarna

Klarna is a payment_method_type on the PaymentIntent. For Sweden:
- `payment_method_types: ["card", "klarna"]`
- Buyer selects in Stripe Elements
- Same webhook flow

The `Order.paymentMethod` field tracks buyer's preference; Stripe handles the actual collection. We store both for analytics.

## 9. Connect onboarding

Path: supplier visits `/supplier/settings/stripe` → page shows current status (no account / pending / active) → "Connect with Stripe" button → POST `/api/v1/stripe/connect/onboard` → server creates an Express account (or retrieves existing) + creates an Account Link → redirects browser to Stripe-hosted onboarding → on completion, Stripe redirects back to `/supplier/settings/stripe` → page polls for updated account status.

Stub mode: same UI flow but mock everything. The button "completes onboarding" instantly with a fake `acct_stub_...` ID stored on Supplier.

## 10. Payout transfer

In `transitionOrderStatus`: when transitioning to `delivered`, fire transfer.

```ts
if (to === "delivered") {
  if (stripeEnabled) {
    const transfer = await stripe.transfers.create({
      amount: order.payoutAmount, currency: "sek",
      destination: supplier.stripeAccountId!,
      transfer_group: order.id,
      metadata: { orderId },
    });
    await db.order.update({ where: { id: orderId }, data: { stripeTransferId: transfer.id } });
  } else {
    await db.order.update({ where: { id: orderId }, data: { stripeTransferId: mockId("tr") } });
  }
}
```

Plus add the `delivered → paid` transition. After transfer, set order to `paid`.

## 11. Supplier payouts page

`/[locale]/supplier/payouts`: lists all orders where `payoutAmount > 0`, grouped by status (Pending = delivered/paid without transfer, Processing = transfer created but not paid by Stripe yet, Paid = transfer paid). Shows: order ID, gross, commission, net payout, status, date.

Real mode: status from Stripe's transfer object via the `transfer.paid` webhook. Stub: all transfers go straight to "paid".

## 12. Admin refund (endpoint only, UI in Phase 6)

`POST /api/v1/admin/orders/:id/refund` body `{ amount?, reason }`:
- Requires session user with `role=admin`
- Creates a Refund via Stripe API (or stubbed)
- Updates order to `cancelled` if full refund
- Logs reason on Order.cancelReason

## 13. Testing

- Unit: stripe helper (mockId format, getStripe returns null when disabled)
- Integration: order placement creates PaymentIntent (stub), webhook handler sets statuses, transitionOrderStatus to delivered fires transfer
- E2E: deferred — Stripe Elements is hard to E2E without real keys

## 14. Klarna note (user request)

User explicitly requested Klarna in this phase (overrides spec default of deferred to v2). Implementation: enable klarna as a PaymentMethod type on the PaymentIntent. No additional integration work needed because Stripe handles Klarna for us. The buyer's existing `klarna_invoice` radio selection on the confirm form is just metadata; Stripe Elements will show both card and Klarna and the buyer chooses there.

## 15. Resolved decisions

| Question | Decision |
|----------|----------|
| Stub mode? | Yes — STRIPE_ENABLED env flag |
| Connect type | Express (Stripe-hosted onboarding) |
| Card capture | Authorize+capture at placement |
| Klarna | Via Stripe as payment_method_type |
| Payout timing | On `delivered` status transition |
| Currency | SEK only |
| 3DS UI | Stripe handles |
| Refund UI | None in Phase 5 (endpoint only) |
| Tax | Spec's 25% VAT already on order; Stripe processes gross |

## 16. Estimated timeline

~1.5 weeks (matches spec). With stub mode, ~1 week — less validation overhead.

| Slice | Days |
|-------|------|
| Stripe helper + state machine extension | 0.5 |
| Modify placeOrder + create PI route | 1 |
| Buyer payment page (Stripe Elements) | 1 |
| Connect onboarding flow | 1.5 |
| Webhook handler + signature verification | 1 |
| Transfer on delivered + payouts page | 1 |
| Refund endpoint | 0.5 |
| Tests + i18n | 1 |
| **Total** | **~7.5 days = ~1.5 weeks** |
