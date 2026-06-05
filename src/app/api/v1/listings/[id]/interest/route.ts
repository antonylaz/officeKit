import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { ListingInterestEmail } from "@/emails/ListingInterest";

const interestSchema = z.object({
  buyerName: z.string().min(1).max(120),
  buyerEmail: z.string().email().max(160),
  buyerCompany: z.string().max(120).nullable().optional(),
  message: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = interestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { items: true },
  });
  if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Only allow interest on approved/listed listings
  if (!["approved", "listed"].includes(listing.status)) {
    return NextResponse.json({ error: "listing_not_available" }, { status: 409 });
  }

  const data = parsed.data;
  const interest = await db.listingInterest.create({
    data: {
      listingId,
      buyerName: data.buyerName.trim(),
      buyerEmail: data.buyerEmail.toLowerCase().trim(),
      buyerCompany: data.buyerCompany?.trim() || null,
      message: data.message?.trim() || null,
    },
  });

  // Notify seller (Resend; soft-fail)
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const localeHeader = req.headers.get("accept-language") ?? "";
    const locale: "sv" | "en" = localeHeader.toLowerCase().startsWith("sv") ? "sv" : "en";
    const itemSummary = listing.items
      .slice(0, 5)
      .map((it) => `${it.quantity}× ${it.description}`)
      .join(" · ");

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: listing.contactEmail,
        replyTo: interest.buyerEmail,
        subject:
          locale === "sv"
            ? `Intresseanmälan: ${interest.buyerName} (${listing.companyName})`
            : `Interest in your listing: ${interest.buyerName} (${listing.companyName})`,
        react: ListingInterestEmail({
          sellerName: listing.contactName,
          sellerCompany: listing.companyName,
          buyerName: interest.buyerName,
          buyerEmail: interest.buyerEmail,
          buyerCompany: interest.buyerCompany,
          message: interest.message,
          itemSummary: itemSummary || "—",
          listingId,
          locale,
        }),
      });
    } catch (err) {
      console.error("Listing interest email failed:", err);
    }
  }

  return NextResponse.json({ id: interest.id });
}
