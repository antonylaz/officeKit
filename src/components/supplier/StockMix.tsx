import { getTranslations } from "next-intl/server";
import type { ItemCategory } from "@prisma/client";

export async function StockMix({ data }: { data: Array<{ category: ItemCategory; newCount: number; usedCount: number }> }) {
  const t = await getTranslations("supplier.stockMix");
  const tCat = await getTranslations("checklist.tabs");
  return (
    <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 4, padding: 24 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t("title")}</h3>
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {data.length === 0 && <p style={{ color: "var(--color-ink-mute)", fontSize: 13 }}>{t("empty")}</p>}
        {data.map((row) => {
          const total = row.newCount + row.usedCount;
          const newPct = total === 0 ? 0 : (row.newCount / total) * 100;
          return (
            <div key={row.category}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{tCat(row.category)}</span><span style={{ color: "var(--color-ink-mute)" }}>{total} {t("units")}</span>
              </div>
              <div style={{ marginTop: 4, display: "flex", height: 6, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${newPct}%`, background: "var(--color-ink)" }} />
                <div style={{ width: `${100 - newPct}%`, background: "var(--color-green-leaf)" }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-ink-mute)" }}>
                {t("new")} {Math.round(newPct)}%  ·  {t("reused")} {Math.round(100 - newPct)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
