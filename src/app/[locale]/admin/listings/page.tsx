import { MapPin, Calendar, Package, Mail } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { ListingStatusControl } from "@/components/admin/ListingStatusControl";

export default async function AdminListingsPage() {
  await requireAdmin();
  const listings = await db.listing.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-mute)" }}>
          {listings.length} submissions
        </p>
        <h1
          className="mt-2 text-4xl tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Resale listings
        </h1>
      </div>

      {listings.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-mute)" }}
        >
          <Package className="size-8 mb-3" />
          <p className="text-sm">No listings yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => {
            const totalUnits = l.items.reduce((n, it) => n + it.quantity, 0);
            return (
              <div
                key={l.id}
                className="flex items-center gap-4 p-4 rounded-xl border bg-white"
                style={{ borderColor: "var(--color-line)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-[15px]">{l.companyName}</h4>
                    <ListingStatusControl listingId={l.id} currentStatus={l.status} />
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold"
                      style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)" }}
                    >
                      {l.reason}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]"
                    style={{ color: "var(--color-ink-mute)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {l.contactName} · {l.contactEmail}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {l.city}
                    </span>
                    {l.moveOutDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        Move-out {l.moveOutDate.toLocaleDateString()}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Package className="size-3" />
                      {l.items.length} lines · {totalUnits} units
                    </span>
                  </div>
                </div>

                <div className="text-right text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
                  {l.createdAt.toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
