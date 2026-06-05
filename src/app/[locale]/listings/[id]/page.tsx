import { notFound } from "next/navigation";
import { MapPin, Calendar, Leaf, Package, ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Link } from "@/i18n/routing";
import { formatSek } from "@/lib/money";
import { ExpressInterestButton } from "@/components/listing/ExpressInterestButton";
import type { ItemCondition } from "@prisma/client";

const CONDITION_LABEL: Record<ItemCondition, string> = {
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

const REASON_LABEL: Record<string, string> = {
  closing: "Office closing",
  downsizing: "Downsizing",
  moving: "Moving",
  refurbishing: "Refurbishing",
  other: "Other",
};

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { displayOrder: "asc" } },
    },
  });
  if (!listing) notFound();
  // Hide drafts from the public — only approved / listed / sold are viewable
  if (!["approved", "listed", "sold"].includes(listing.status)) notFound();

  const totalUnits = listing.items.reduce((n, it) => n + it.quantity, 0);
  const totalAskingOre = listing.items.reduce(
    (s, it) => s + (it.askingPriceOre ?? 0) * it.quantity,
    0,
  );
  const sold = listing.status === "sold";

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-12 pb-24">
      <Link
        href="/sell"
        className="inline-flex items-center gap-1 text-[12px] mb-8 transition-colors hover:opacity-70"
        style={{ color: "var(--color-ink-mute)" }}
      >
        <ChevronLeft className="size-3.5" />
        Back to Sell
      </Link>

      {/* Header */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-12">
        <div>
          <p
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
            style={{
              background: "rgba(27, 48, 38, 0.05)",
              borderColor: "rgba(27, 48, 38, 0.2)",
              color: "var(--color-forest)",
            }}
          >
            <Leaf className="size-3" />
            {REASON_LABEL[listing.reason] ?? listing.reason}
            {sold && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded uppercase tracking-[0.08em] text-[9px] font-bold"
                style={{ background: "var(--color-ink-mute)", color: "white" }}
              >
                Sold
              </span>
            )}
          </p>
          <h1
            className="mt-5 text-4xl md:text-5xl tracking-tight leading-[1.05]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {listing.companyName}
          </h1>
          <div
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {listing.city}
            </span>
            {listing.moveOutDate && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Available from {listing.moveOutDate.toLocaleDateString()}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Package className="size-3.5" />
              {totalUnits} units · {listing.items.length} item types
            </span>
          </div>
        </div>

        {/* CTA card */}
        <aside
          className="rounded-2xl border p-5 self-start sticky top-8"
          style={{
            borderColor: "var(--color-line)",
            background: "var(--color-paper)",
          }}
        >
          {totalAskingOre > 0 && (
            <>
              <p
                className="text-[11px] uppercase tracking-[0.12em] font-semibold"
                style={{ color: "var(--color-ink-mute)" }}
              >
                Total asking
              </p>
              <p
                className="mt-1 text-3xl tabular-nums"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-forest)" }}
              >
                {formatSek(totalAskingOre)}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
                Open to bulk offers
              </p>
              <hr className="my-4" style={{ borderColor: "var(--color-line)" }} />
            </>
          )}
          {sold ? (
            <p
              className="text-[13px] py-2 text-center rounded-lg border"
              style={{
                borderColor: "var(--color-line)",
                color: "var(--color-ink-mute)",
                background: "var(--color-cream)",
              }}
            >
              This listing has sold.
            </p>
          ) : (
            <ExpressInterestButton listingId={listing.id} companyName={listing.companyName} />
          )}
          <p
            className="mt-3 text-[11px] leading-relaxed"
            style={{ color: "var(--color-ink-mute)" }}
          >
            OfficeKit connects you with the seller. You contract and pay directly.
          </p>
        </aside>
      </div>

      {/* Photos */}
      {listing.photos.length > 0 && (
        <section className="mt-12">
          <h2
            className="text-xl tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Photos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {listing.photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-square rounded-xl overflow-hidden border block transition-transform hover:scale-[1.02]"
                style={{ borderColor: "var(--color-line)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Items */}
      <section className="mt-12">
        <h2
          className="text-xl tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What&apos;s for sale
        </h2>
        <div className="space-y-2">
          {listing.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-white"
              style={{ borderColor: "var(--color-line)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[15px] leading-tight">{it.description}</p>
                <div
                  className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  <span>Qty {it.quantity}</span>
                  <span>{CONDITION_LABEL[it.condition]}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {it.askingPriceOre != null ? (
                  <>
                    <div
                      className="font-semibold text-[15px] tabular-nums"
                      style={{ color: "var(--color-forest)" }}
                    >
                      {formatSek(it.askingPriceOre)}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
                      per unit
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] italic" style={{ color: "var(--color-ink-mute)" }}>
                    Make offer
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Notes */}
      {listing.notes && (
        <section className="mt-12">
          <h2
            className="text-xl tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Seller notes
          </h2>
          <p
            className="p-5 rounded-xl border italic leading-relaxed text-[14px]"
            style={{
              borderColor: "var(--color-line)",
              background: "var(--color-paper)",
              color: "var(--color-ink-soft)",
            }}
          >
            &quot;{listing.notes}&quot;
          </p>
        </section>
      )}
    </div>
  );
}
