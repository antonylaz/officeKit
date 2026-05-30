import { getTranslations } from "next-intl/server";
import { SellLanding } from "@/components/sell/SellLanding";

export default async function SellPage() {
  const t = await getTranslations("sell.landing");
  return (
    <SellLanding
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      subtitle={t("subtitle")}
      cta={t("cta")}
      step1Title={t("steps.1.title")}
      step1Desc={t("steps.1.desc")}
      step2Title={t("steps.2.title")}
      step2Desc={t("steps.2.desc")}
      step3Title={t("steps.3.title")}
      step3Desc={t("steps.3.desc")}
      whyTitle={t("why.title")}
      whyA={t("why.a")}
      whyB={t("why.b")}
      whyC={t("why.c")}
      faq1Q={t("faq.1.q")}
      faq1A={t("faq.1.a")}
      faq2Q={t("faq.2.q")}
      faq2A={t("faq.2.a")}
      faq3Q={t("faq.3.q")}
      faq3A={t("faq.3.a")}
    />
  );
}
