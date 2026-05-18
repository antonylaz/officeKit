import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { getTranslations } from "next-intl/server";

export default async function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const t = await getTranslations();
  return (
    <div data-industry={project.industry} style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("floorplan.title")}</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 16 }}>Coming in Phase 2. For now you can proceed without one.</p>
      <Link
        href={`/projects/${id}/request`}
        style={{ display: "inline-block", marginTop: 32, padding: "16px 24px", background: "var(--ok-accent)", color: "white", textTransform: "uppercase", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textDecoration: "none", borderRadius: 4 }}
      >
        {t("common.cta.requestQuotes")} →
      </Link>
    </div>
  );
}
