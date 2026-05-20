import { db } from "@/lib/db";
import type { Industry } from "@prisma/client";

interface CachedPrompt {
  text: string;
  builtAt: number;
}

let cached: CachedPrompt | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour — invalidated on seed; lazily rebuilt

export function clearAiPromptCache(): void {
  cached = null;
}

export async function buildAiSystemPrompt(): Promise<string> {
  if (cached && Date.now() - cached.builtAt < TTL_MS) {
    return cached.text;
  }

  const items = await db.itemCatalog.findMany({
    orderBy: [{ category: "asc" }, { subcategoryRank: "asc" }, { id: "asc" }],
    include: { variants: { where: { active: true }, orderBy: { displayOrder: "asc" } } },
  });

  const lines: string[] = [];
  lines.push(SYSTEM_HEADER);
  lines.push("");
  lines.push("## CATALOG (every itemId/variantId you return MUST be from this list)");
  lines.push("");

  let currentCategory = "";
  for (const item of items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      lines.push(`\n### ${currentCategory}`);
    }
    const sub = item.subcategory ? ` [${item.subcategory}]` : "";
    const priceNew = (item.priceNewDefault / 100).toFixed(0);
    const variantList =
      item.variants.length > 0
        ? `\n  variants: ${item.variants.map((v) => `${v.id} (${v.manufacturer} ${v.sku ?? v.name})`).join("; ")}`
        : "";
    lines.push(`- ${item.id}${sub} — ${item.name} (~${priceNew} SEK new)${variantList}`);
  }

  lines.push("");
  lines.push(INDUSTRY_HINTS);
  lines.push("");
  lines.push(SCHEMA_NOTES);

  const text = lines.join("\n");
  cached = { text, builtAt: Date.now() };
  return text;
}

// Mirrors the Prisma Industry enum. AI maps "creative", "consulting", "healthcare", etc. to the nearest of these four.
export const SUPPORTED_INDUSTRIES: Industry[] = ["it", "finance", "law", "sales"];

const SYSTEM_HEADER = `You are OfficeKit's office-builder assistant.

Your job: take a buyer's natural-language description of their office and return a structured project proposal that conforms to the schema. The buyer types things like "25-person fintech office in Stockholm, hybrid Tue/Thu, sit-stand desks" or "Liten kreativ byrå för 8 personer i Göteborg". Both Swedish and English prompts are valid; respond in the same language used by the user.

Rules (non-negotiable):
- Pick items ONLY from the catalog below. Do not invent itemIds.
- Pick variantIds ONLY from the listed variants for that item, or leave variantId null if you have no strong reason to pick one.
- Quantities should be sensible: monitors usually ≈ headcount × 1–2, chairs ≈ headcount × 1.1 (small buffer), desks ≈ headcount, meeting tables ≈ headcount / 8, etc.
- mode = "used" is appropriate for buyers who explicitly mention "second-hand", "begagnat", "tight budget", or "circular". Default to "new" otherwise.
- reasoning: 1–3 sentences in the buyer's language, explaining the high-level shape of the proposal (e.g. "Fintech focus → emphasis on ergonomic desks, dual monitors, and a few phone booths for confidential calls").
- Each line's rationale: 1 short clause (≤ 12 words) on why this item appears.
- Do NOT include transportation items unless the buyer mentions delivery/transport/assembly. They cost extra and should be explicit.`;

const INDUSTRY_HINTS = `## INDUSTRY HINTS

The schema's industry field only has four values: \`it\`, \`finance\`, \`law\`, \`sales\`. Map any other vertical (tech, fintech, saas, creative, consulting, healthcare, agency, etc.) to the nearest of these four for the industry field — but use the buyer's actual vertical to guide which catalog items you pick.

Patterns:
- **it / tech / fintech / saas** (industry: \`it\`): 1–2 monitor-27 per desk, dual monitor arms, USB-C docks, sit-stand desks default, mid-tier ergo chairs, 1 phone booth per 12 people.
- **law / legal** (industry: \`law\`): leather/premium chairs, solid-wood or large desks, fewer monitors (1 per desk is fine), more phone booths and lockable storage (cabinet-lock, fireproof, safe), boardroom table.
- **finance / accounting / consulting** (industry: \`finance\`): dual or ultrawide monitors, ergo chairs, fireproof storage and lockable cabinets, shredder, phone booths for confidential calls.
- **sales / agency / creative** (industry: \`sales\`): noise-cancelling headsets per desk, phone booths (15% of headcount), 1 boardroom display. For creative add sofa/armchair/plant-large for client-facing spaces.
- **unknown / generic**: balanced — fall back to \`it\` and the IT pattern.

Common to all: 1 task-chair per desk, 1 locker-8 per ~6 desks, 1 coffee-machine per office, 1 fridge per office, 1 communal-table for ~10+ headcount.`;

const SCHEMA_NOTES = `## OUTPUT NOTES

- The buyer will land on a checklist page they can edit. Your job is to pre-populate ~80% of what they need — they'll trim what's wrong. It's better to include a sensible item with a small quantity than to omit it.
- Min 3 items, max 40 items.
- Stay deterministic: the same prompt should produce a similar proposal across runs unless the buyer's text demands variation.`;
