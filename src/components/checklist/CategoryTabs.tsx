"use client";
import { useTranslations } from "next-intl";
import type { ItemCatalog } from "@prisma/client";

const CATEGORIES: ItemCatalog["category"][] = ["workstations", "tech", "meeting", "storage", "lounge", "kitchen"];

export function CategoryTabs({ active, onChange }: { active: ItemCatalog["category"]; onChange: (c: ItemCatalog["category"]) => void }) {
  const t = useTranslations("checklist.tabs");
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            padding: "8px 18px",
            borderRadius: 100,
            border: "1px solid var(--color-line)",
            background: active === c ? "var(--color-ink)" : "transparent",
            color: active === c ? "white" : "var(--color-ink)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t(c)}
        </button>
      ))}
    </div>
  );
}
