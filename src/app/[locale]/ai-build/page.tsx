import { getTranslations } from "next-intl/server";
import { AiBuildPage } from "@/components/ai-build/AiBuildPage";

export default async function AiBuildRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const aiAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <AiBuildPage
      locale={locale}
      aiAvailable={aiAvailable}
      eyebrow={t("aiBuild.eyebrow")}
      beta={t("aiBuild.beta")}
      title={t("aiBuild.title")}
      subtitle={t("aiBuild.subtitle")}
      notConfigured={t("aiBuild.errors.notConfigured")}
    />
  );
}
