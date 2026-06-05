import { getTranslations } from "next-intl/server";
import { Leaf } from "lucide-react";
import { ListingForm } from "@/components/sell/ListingForm";

export default async function SellNewPage() {
  const t = await getTranslations("sell.form");
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-16 pb-24">
      <p
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium px-3 py-1.5 rounded-full border"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-line)",
          color: "var(--color-forest)",
        }}
      >
        <Leaf className="size-3.5" />
        {t("eyebrow")}
      </p>
      <h1
        className="mt-8 text-4xl md:text-5xl tracking-tight leading-[1.1]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("title")}
      </h1>
      <p
        className="mt-4 text-base leading-relaxed max-w-2xl"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {t("subtitle")}
      </p>
      <div className="mt-10">
        <ListingForm />
      </div>
    </div>
  );
}
