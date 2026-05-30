import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { Link } from "@/i18n/routing";

export default async function SellThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!listing) notFound();
  const t = await getTranslations("sell.thanks");

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-8 pt-24 pb-32">
      <div
        className="size-14 rounded-full inline-flex items-center justify-center"
        style={{ background: "rgba(74, 107, 82, 0.15)", color: "var(--color-green-leaf)" }}
      >
        <CheckCircle2 className="size-7" />
      </div>
      <h1
        className="mt-6 text-4xl md:text-5xl tracking-tight leading-[1.1]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("title")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        {t("subtitle", { companyName: listing.companyName, itemCount: listing.items.length })}
      </p>

      <div
        className="mt-10 p-6 rounded-2xl border space-y-3"
        style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}
      >
        <p
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] font-semibold"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Mail className="size-3.5" />
          {t("nextStepsTitle")}
        </p>
        <ol className="space-y-2 text-[14px] leading-relaxed list-decimal pl-5" style={{ color: "var(--color-ink-soft)" }}>
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
      </div>

      <p className="mt-8 text-sm" style={{ color: "var(--color-ink-mute)" }}>
        Reference: <span style={{ fontFamily: "var(--font-mono)" }}>{listing.id.slice(0, 8)}</span>
      </p>

      <div className="mt-10 flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center px-5 py-3 rounded-lg border text-xs uppercase tracking-[0.1em] font-semibold transition-colors hover:bg-accent/40"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        >
          {t("backHome")}
        </Link>
        <Link
          href="/sell"
          className="inline-flex items-center px-5 py-3 rounded-lg text-white text-xs uppercase tracking-[0.1em] font-semibold shadow-sm hover:shadow-md transition-shadow"
          style={{ background: "var(--color-forest)" }}
        >
          {t("anotherListing")}
        </Link>
      </div>
    </div>
  );
}
