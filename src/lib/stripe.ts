import Stripe from "stripe";
import { randomBytes } from "node:crypto";

export const stripeEnabled =
  process.env.STRIPE_ENABLED === "true" && !!process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripeEnabled) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

export function mockId(prefix: string): string {
  return `${prefix}_stub_${randomBytes(8).toString("hex")}`;
}

export function isStubId(id: string | null | undefined): boolean {
  return !!id && id.includes("_stub_");
}
