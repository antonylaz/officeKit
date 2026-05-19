"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RfqRow } from "./RfqRow";
import type { Rfq, Project, Company, Quote, ProjectItem } from "@prisma/client";

type RfqWithProject = Rfq & {
  project: Project & { company: Company; items: ProjectItem[] };
  quote: Quote | null;
};

const STATUSES = ["all", "sent", "viewed", "quoted", "won", "lost", "expired"] as const;

export function RfqInbox({ rfqs, activeStatus }: { rfqs: RfqWithProject[]; activeStatus: string }) {
  const t = useTranslations("supplier.inbox");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setStatus(s: string) {
    const params = new URLSearchParams(sp.toString());
    if (s === "all") params.delete("status");
    else params.set("status", s);
    router.push(`${pathname}?${params}`);
  }

  return (
    <>
      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              border: "1px solid var(--color-line)",
              background: activeStatus === s ? "var(--color-ink)" : "transparent",
              color: activeStatus === s ? "white" : "var(--color-ink)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}>
            {t(`filter_${s}`)}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        {rfqs.length === 0 ? (
          <p style={{ color: "var(--color-ink-mute)" }}>{t("empty")}</p>
        ) : (
          rfqs.map((r) => <RfqRow key={r.id} rfq={r} />)
        )}
      </div>
    </>
  );
}
