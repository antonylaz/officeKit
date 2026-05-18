import type { Industry } from "@prisma/client";

export type Presets = Partial<Record<Industry, number>>;

export function computeQuantity(presets: Presets, industry: Industry, headcount: number): number {
  const ratio = presets[industry] ?? 0;
  return Math.ceil(ratio * headcount);
}

export interface IndustryMeta {
  id: Industry;
  label: string;
  tagline: string;
  avgSpendPerSeatSek: number;
  reuseShareLabel: string;
  setupTimeLabel: string;
  complianceFlags?: string[];
}

export const INDUSTRIES: readonly IndustryMeta[] = [
  {
    id: "it",
    label: "IT & Tech",
    tagline: "Software shops, dev studios, SaaS startups. Heavy on monitors, dual-screen setups, and reliable AV.",
    avgSpendPerSeatSek: 28_400,
    reuseShareLabel: "~55%",
    setupTimeLabel: "3–5 days",
  },
  {
    id: "finance",
    label: "Finance & Economic",
    tagline: "Accounting, audit, advisory, asset management. Privacy-conscious, document-heavy, client-facing.",
    avgSpendPerSeatSek: 34_200,
    reuseShareLabel: "~45%",
    setupTimeLabel: "4–6 days",
    complianceFlags: ["GDPR", "ISO 27001"],
  },
  {
    id: "sales",
    label: "Sales & Commercial",
    tagline: "Field sales, inside sales, account management. Open floor, lots of calls, hot-desking common.",
    avgSpendPerSeatSek: 22_800,
    reuseShareLabel: "~60%",
    setupTimeLabel: "2–4 days",
  },
  {
    id: "law",
    label: "Law Firms",
    tagline: "Advokatbyrå, in-house counsel. Confidentiality-first, individual offices, paper archives still relevant.",
    avgSpendPerSeatSek: 41_600,
    reuseShareLabel: "~50%",
    setupTimeLabel: "5–8 days",
    complianceFlags: ["Sekretess", "GDPR"],
  },
] as const;
