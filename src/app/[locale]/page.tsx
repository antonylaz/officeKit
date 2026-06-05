import { getTranslations } from "next-intl/server";
import { LandingHero } from "@/components/landing/LandingHero";

export default async function LandingPage() {
  const t = await getTranslations();
  return (
    <LandingHero
      tagline={t("common.tagline")}
      headline={t("landing.headline")}
      subhead={t("landing.subhead")}
      ctaStart={t("common.cta.start")}
      ctaAi={t("aiBuild.ctaLanding")}
      beta={t("aiBuild.beta")}
      stats={[
        { label: t("landing.stats.setupTime"), value: "11 days → 2" },
        { label: t("landing.stats.suppliers"), value: "37 across Sverige" },
        { label: t("landing.stats.reuseShare"), value: "Up to 60%" },
      ]}
    />
  );
}
