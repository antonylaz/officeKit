import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/supplier-auth";
import { db } from "@/lib/db";
import { getStripe, mockId, stripeEnabled } from "@/lib/stripe";

export async function POST() {
  const { supplierId } = await requireSupplier();
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!stripeEnabled) {
    // Stub: instantly mark as onboarded
    let acctId = supplier.stripeAccountId;
    if (!acctId) {
      acctId = mockId("acct");
      await db.supplier.update({ where: { id: supplierId }, data: { stripeAccountId: acctId } });
    }
    return NextResponse.json({ url: `${appUrl}/sv/supplier/settings/stripe?stub=ok`, stubbed: true });
  }

  const stripe = getStripe()!;
  let acctId = supplier.stripeAccountId;
  if (!acctId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "SE",
      email: undefined,
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      business_type: "company",
      business_profile: { name: supplier.name, product_description: "Office furniture and equipment" },
    });
    acctId = account.id;
    await db.supplier.update({ where: { id: supplierId }, data: { stripeAccountId: acctId } });
  }

  const link = await stripe.accountLinks.create({
    account: acctId,
    refresh_url: `${appUrl}/api/v1/stripe/connect/refresh`,
    return_url: `${appUrl}/sv/supplier/settings/stripe`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
