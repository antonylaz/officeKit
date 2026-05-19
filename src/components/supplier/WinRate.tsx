import { getTranslations } from "next-intl/server";

export async function WinRate({ data }: { data: Array<{ supplierName: string; winRate: number; sample: number }> }) {
  const t = await getTranslations("supplier.winRate");
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t("title")}</h3>
      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        {data.length === 0 && <p style={{ color: "var(--color-ink-mute)", fontSize: 13 }}>{t("empty")}</p>}
        {data.map((row) => (
          <div key={row.supplierName}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink-mute)" }}>
              {t("vs")} {row.supplierName}
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 4 }}>
              {Math.round(row.winRate * 100)}% <span style={{ fontSize: 13, color: "var(--color-ink-mute)" }}>{t("winsOf", { n: row.sample })}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
