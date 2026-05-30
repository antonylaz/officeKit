import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { ListingReceivedEmail } from "@/emails/ListingReceived";

const listingItemSchema = z.object({
  catalogItemId: z.string().nullable().optional(),
  description: z.string().min(1).max(160),
  quantity: z.number().int().min(1).max(2000),
  condition: z.enum(["like_new", "good", "fair", "worn"]),
  askingPriceSek: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

const listingSchema = z.object({
  companyName: z.string().min(1).max(120),
  contactName: z.string().min(1).max(120),
  contactEmail: z.string().email().max(160),
  contactPhone: z.string().max(40).nullable().optional(),
  city: z.string().min(1).max(60),
  moveOutDate: z.string().nullable().optional(), // ISO date or null
  reason: z.enum(["closing", "downsizing", "moving", "refurbishing", "other"]),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(listingItemSchema).min(1).max(80),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const listing = await db.listing.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      contactEmail: data.contactEmail.toLowerCase(),
      contactPhone: data.contactPhone ?? null,
      city: data.city,
      moveOutDate: data.moveOutDate ? new Date(data.moveOutDate) : null,
      reason: data.reason,
      notes: data.notes ?? null,
      items: {
        create: data.items.map((it) => ({
          catalogItemId: it.catalogItemId ?? null,
          description: it.description,
          quantity: it.quantity,
          condition: it.condition,
          askingPriceOre: it.askingPriceSek != null ? it.askingPriceSek * 100 : null,
        })),
      },
    },
  });

  // Fire-and-forget seller confirmation email (no-op if RESEND_API_KEY missing)
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const localeHeader = req.headers.get("accept-language") ?? "";
    const locale: "sv" | "en" = localeHeader.toLowerCase().startsWith("sv") ? "sv" : "en";
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: listing.contactEmail,
        subject: locale === "sv" ? "Tack — vi har fått er annons" : "Thanks — we've got your listing",
        react: ListingReceivedEmail({
          contactName: listing.contactName,
          companyName: listing.companyName,
          itemCount: data.items.length,
          listingId: listing.id,
          locale,
        }),
      });
    } catch (err) {
      // Don't fail the listing if email fails — surface in server log only
      console.error("Listing confirmation email failed:", err);
    }
  }

  return NextResponse.json({ id: listing.id });
}
