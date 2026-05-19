# Soft Launch Checklist

Target: 1 buyer + 3 vetted suppliers running through the full flow.

## Two weeks before launch
- [ ] Domain `officekit.se` purchased + DNS pointed at Vercel
- [ ] Resend domain verification complete (DKIM + SPF + DMARC)
- [ ] Stripe account in live mode (not test), Connect onboarding tested end-to-end
- [ ] Privacy policy + terms drafted, reviewed by Swedish counsel
- [ ] Three vetted suppliers contacted, NDAs signed if needed

## One week before launch
- [ ] Production env vars set in Vercel (see README "Production deploy checklist")
- [ ] Catalog reviewed for accuracy — prices match real supplier expectations
- [ ] First-time admin invited via `pnpm tsx scripts/invite-supplier.ts --email <admin> --role admin`
- [ ] Three real supplier invites sent via the same script
- [ ] Each supplier completes onboarding: password + TOTP enrollment, Stripe Connect onboarding
- [ ] Test order placed end-to-end on prod (use a real card, then refund via admin)

## Launch day
- [ ] One buyer onboarded (you, manually walking them through it)
- [ ] Buyer completes a real project: industry pick → checklist → floor plan → quote request
- [ ] All 3 suppliers receive RFQ email
- [ ] All 3 suppliers submit quotes within 24h
- [ ] Buyer picks a quote, places order (real payment)
- [ ] Supplier transitions order through fulfillment to delivered
- [ ] Payout transferred to supplier's Stripe account

## Post-launch (first month)
- [ ] Monitor PostHog `project_created → order_placed` funnel daily
- [ ] Monitor Sentry for unexpected errors
- [ ] Check Stripe dashboard daily for failed payments or disputes
- [ ] Weekly call with each supplier to gather feedback
- [ ] Iterate on catalog, lead times, and pricing based on first 5 quotes
