import { notFound } from "next/navigation";
import { getAuthorizedProject } from "@/server/projects";
import { computeSummary } from "@/server/project-summary";
import { RequestForm } from "@/components/buyer/RequestForm";
import { formatSek } from "@/lib/money";
import { getTranslations } from "next-intl/server";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getAuthorizedProject(id);
  if (!project) notFound();
  const summary = computeSummary(project.items);
  const t = await getTranslations();
  return (
    <div data-industry={project.industry} style={{ maxWidth: 720, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48 }}>{t("request.title")}</h1>
      <p style={{ marginTop: 16, color: "var(--color-ink-soft)" }}>{t("request.subhead")}</p>
      <dl style={{ marginTop: 32, display: "grid", gap: 12, fontSize: 14 }}>
        <Row k="Industry" v={project.industry} />
        <Row k="Headcount" v={String(project.headcount)} />
        <Row k="Location" v={project.city} />
        <Row k="Items" v={String(summary.itemsSelected)} />
        <Row k="Estimated total" v={formatSek(summary.totalOre)} />
      </dl>
      <RequestForm projectId={id} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-line)", paddingBottom: 8 }}>
      <dt style={{ color: "var(--color-ink-mute)" }}>{k}</dt><dd>{v}</dd>
    </div>
  );
}
