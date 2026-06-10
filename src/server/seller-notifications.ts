import { Resend } from "resend";
import { db } from "@/lib/db";
import { ListingStatusSellerEmail } from "@/emails/ListingStatusSeller";
import type { ListingStatus } from "@prisma/client";

const SELLER_NOTIFY_STATUSES = new Set<ListingStatus>([
  "reviewing",
  "approved",
  "listed",
  "sold",
  "withdrawn",
]);

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/**
 * Notify the seller that their listing's status changed. Fires only for
 * statuses worth telling the seller about — skips the initial `submitted` row.
 * Soft-fails on missing Resend keys; never throws to the caller.
 */
export async function notifySellerListingStatus(
  listingId: string,
  newStatus: ListingStatus,
): Promise<void> {
  if (!SELLER_NOTIFY_STATUSES.has(newStatus)) return;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;

  try {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, contactName: true, contactEmail: true, companyName: true },
    });
    if (!listing) return;

    // Stored locale isn't tracked per-listing yet; default to sv (the listing form
    // is sv-first). When/if we add a locale field on Listing, swap here.
    const locale: "sv" | "en" = "sv";
    const subject =
      locale === "sv"
        ? `OfficeKit — annonsen för ${listing.companyName}`
        : `OfficeKit — listing for ${listing.companyName}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: listing.contactEmail,
      subject,
      react: ListingStatusSellerEmail({
        sellerName: listing.contactName,
        companyName: listing.companyName,
        status: newStatus as Exclude<ListingStatus, "submitted">,
        listingId: listing.id,
        appUrl: appUrl(),
        locale,
      }),
    });
  } catch (err) {
    console.error("notifySellerListingStatus failed:", err);
  }
}
