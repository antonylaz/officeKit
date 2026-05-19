import { requireSupplier } from "@/lib/supplier-auth";
import { db } from "@/lib/db";
import { getStripe, stripeEnabled, isStubId } from "@/lib/stripe";
import { StripeConnectButton } from "@/components/supplier/StripeConnectButton";

export default async function StripeSettingsPage() {
  const { supplierId } = await requireSupplier();
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const stripe = getStripe();

  let status: "none" | "pending" | "active" | "stubbed" = "none";
  let detailsSubmitted = false;
  let payoutsEnabled = false;

  if (supplier.stripeAccountId) {
    if (isStubId(supplier.stripeAccountId) || !stripe) {
      status = "stubbed";
      detailsSubmitted = true;
      payoutsEnabled = true;
    } else {
      try {
        const acct = await stripe.accounts.retrieve(supplier.stripeAccountId);
        detailsSubmitted = acct.details_submitted;
        payoutsEnabled = acct.payouts_enabled;
        status = payoutsEnabled ? "active" : "pending";
      } catch {
        status = "pending";
      }
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40 }}>Stripe Connect</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
        OfficeKit transfers your share of each order to your connected Stripe account. Onboarding is hosted by Stripe and takes ~5 minutes.
      </p>

      <div style={{ marginTop: 32, padding: 24, background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4 }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-ink-mute)" }}>Status</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 24, marginTop: 8 }}>
          {status === "none" && "Not connected"}
          {status === "pending" && "Onboarding incomplete"}
          {status === "active" && "Active — ready to receive payouts"}
          {status === "stubbed" && "Connected (stub mode — no real Stripe)"}
        </p>
        {status === "pending" && (
          <p style={{ marginTop: 8, color: "var(--color-ink-mute)", fontSize: 13 }}>
            Details submitted: {detailsSubmitted ? "yes" : "no"} · Payouts enabled: {payoutsEnabled ? "yes" : "no"}
          </p>
        )}
      </div>

      {!stripeEnabled && (
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--color-gold)" }}>
          STRIPE_ENABLED is false. Onboarding will set a stub account ID instead of connecting to Stripe.
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <StripeConnectButton hasAccount={!!supplier.stripeAccountId} active={status === "active" || status === "stubbed"} />
      </div>
    </div>
  );
}
