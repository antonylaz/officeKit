import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { db } from "@/lib/db";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export async function GET() {
  const { supplierId } = await requireSupplier();
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!stripeEnabled || !supplier.stripeAccountId) {
    return NextResponse.redirect(`${appUrl}/sv/supplier/settings/stripe`);
  }

  const stripe = getStripe()!;
  const link = await stripe.accountLinks.create({
    account: supplier.stripeAccountId,
    refresh_url: `${appUrl}/api/v1/stripe/connect/refresh`,
    return_url: `${appUrl}/sv/supplier/settings/stripe`,
    type: "account_onboarding",
  });
  return NextResponse.redirect(link.url);
}
