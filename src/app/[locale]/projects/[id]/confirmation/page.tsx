import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { getTranslations } from "next-intl/server";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const t = await getTranslations("confirmation");
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("title")}</h1>
      <p style={{ marginTop: 16, color: "var(--color-ink-soft)" }}>{t("subhead")}</p>
      <p style={{ marginTop: 8, fontFamily: "var(--font-mono)" }}>{id}</p>
      <h3 style={{ marginTop: 48, fontFamily: "var(--font-display)" }}>{t("next")}</h3>
      <ol style={{ marginTop: 16, textAlign: "left", color: "var(--color-ink-soft)" }}>
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
        <li>{t("step3")}</li>
      </ol>
    </div>
  );
}
