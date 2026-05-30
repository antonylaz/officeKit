"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

type ListingStatus = "submitted" | "reviewing" | "approved" | "listed" | "sold" | "withdrawn";

const ALL: ListingStatus[] = ["submitted", "reviewing", "approved", "listed", "sold", "withdrawn"];

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  submitted: { bg: "rgba(184, 134, 44, 0.15)", fg: "var(--color-gold)" },
  reviewing: { bg: "rgba(58, 66, 62, 0.1)", fg: "var(--color-ink-soft)" },
  approved: { bg: "rgba(74, 107, 82, 0.15)", fg: "var(--color-green-leaf)" },
  listed: { bg: "rgba(27, 48, 38, 0.1)", fg: "var(--color-forest)" },
  sold: { bg: "rgba(74, 107, 82, 0.2)", fg: "var(--color-green-leaf)" },
  withdrawn: { bg: "rgba(184, 66, 28, 0.1)", fg: "var(--color-terracotta)" },
};

export function ListingStatusControl({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: ListingStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ListingStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [pending, startTransition] = useTransition();

  async function update(next: ListingStatus) {
    if (next === status) return;
    setSaving(true);
    setSavedTick(false);
    try {
      const res = await fetch(`/api/v1/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setSaving(false);
        return;
      }
      setStatus(next);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  const s = STATUS_STYLES[status] ?? STATUS_STYLES.submitted!;
  const busy = saving || pending;

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative">
        <select
          value={status}
          onChange={(e) => update(e.target.value as ListingStatus)}
          disabled={busy}
          className="appearance-none rounded-full pl-3 pr-7 py-1 text-[10px] uppercase tracking-[0.1em] font-semibold border-0 outline-none focus:ring-2 transition-shadow disabled:opacity-60 cursor-pointer"
          style={{ background: s.bg, color: s.fg }}
          aria-label="Change status"
        >
          {ALL.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px]"
          style={{ color: s.fg }}
        >
          ▾
        </span>
      </div>
      {busy && <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--color-ink-mute)" }} />}
      {savedTick && !busy && (
        <Check className="size-3.5" style={{ color: "var(--color-green-leaf)" }} aria-label="saved" />
      )}
    </div>
  );
}
