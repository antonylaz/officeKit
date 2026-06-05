import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { INDUSTRIES } from "@/lib/presets";
import { IndustryCard } from "@/components/industry/IndustryCard";

export default async function StartPage() {
  const t = await getTranslations("industry");
  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-16 pb-24">
      <div className="max-w-3xl">
        <p
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em]"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Building2 className="size-3.5" />
          Step 1 of 3
        </p>
        <h1
          className="mt-4 text-5xl md:text-6xl tracking-tight leading-[1.05]"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          {t("title")}
        </h1>
        <p
          className="mt-5 text-lg leading-relaxed"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {t("subhead")}
        </p>
      </div>

      <div
        className="mt-14 grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        {INDUSTRIES.map((i, idx) => (
          <IndustryCard key={i.id} industry={i} index={idx} />
        ))}
      </div>
    </div>
  );
}
