import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildAiSystemPrompt } from "./ai-system-prompt";
import { computeAiCostOre } from "@/lib/ai-pricing";

export const PROPOSAL_SCHEMA = z.object({
  projectName: z.string().min(1).max(80),
  industry: z.enum(["it", "finance", "law", "sales"]),
  headcount: z.number().int().min(1).max(2000),
  city: z.string().min(1).max(60),
  reasoning: z.string().max(400),
  items: z
    .array(
      z.object({
        itemId: z.string(),
        variantId: z.string().nullable(),
        quantity: z.number().int().min(1).max(500),
        mode: z.enum(["new", "used"]),
        rationale: z.string().max(120),
      }),
    )
    .min(3)
    .max(40),
});

export type Proposal = z.infer<typeof PROPOSAL_SCHEMA>;

export interface ValidationResult {
  ok: boolean;
  invalidItemIds: string[];
  invalidVariantIds: string[];
  mismatchedVariantItemIds: string[];
}

export async function validateProposal(proposal: Proposal): Promise<ValidationResult> {
  const itemIds = new Set(proposal.items.map((l) => l.itemId));
  const variantIds = new Set(proposal.items.map((l) => l.variantId).filter((v): v is string => v !== null));

  const [items, variants] = await Promise.all([
    db.itemCatalog.findMany({ where: { id: { in: [...itemIds] } }, select: { id: true } }),
    variantIds.size > 0
      ? db.productVariant.findMany({ where: { id: { in: [...variantIds] } }, select: { id: true, itemId: true } })
      : Promise.resolve([] as { id: string; itemId: string }[]),
  ]);

  const foundItemIds = new Set(items.map((i) => i.id));
  const variantByItemId = new Map<string, string>();
  for (const v of variants) variantByItemId.set(v.id, v.itemId);

  const invalidItemIds: string[] = [];
  const invalidVariantIds: string[] = [];
  const mismatchedVariantItemIds: string[] = [];

  for (const line of proposal.items) {
    if (!foundItemIds.has(line.itemId)) invalidItemIds.push(line.itemId);
    if (line.variantId !== null) {
      const owner = variantByItemId.get(line.variantId);
      if (!owner) invalidVariantIds.push(line.variantId);
      else if (owner !== line.itemId) mismatchedVariantItemIds.push(line.variantId);
    }
  }

  return {
    ok: invalidItemIds.length === 0 && invalidVariantIds.length === 0 && mismatchedVariantItemIds.length === 0,
    invalidItemIds,
    invalidVariantIds,
    mismatchedVariantItemIds,
  };
}

export async function createProjectFromProposal(proposal: Proposal): Promise<{ projectId: string }> {
  // Deduplicate by itemId (keep first occurrence)
  const seen = new Set<string>();
  const dedupedItems = proposal.items.filter((l) => {
    if (seen.has(l.itemId)) return false;
    seen.add(l.itemId);
    return true;
  });

  const company = await db.company.create({ data: { name: proposal.projectName } });
  const project = await db.project.create({
    data: {
      companyId: company.id,
      name: proposal.projectName,
      industry: proposal.industry,
      headcount: proposal.headcount,
      city: proposal.city,
      status: "draft",
      items: {
        create: dedupedItems.map((l) => ({
          itemId: l.itemId,
          variantId: l.variantId,
          quantity: l.quantity,
          mode: l.mode,
        })),
      },
    },
  });

  return { projectId: project.id };
}

interface CallClaudeArgs {
  prompt: string;
  locale: string;
  model: string;
}

interface CallClaudeResult {
  proposal: Proposal | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
  costOre: number;
  rawError?: string;
}

const PROPOSAL_SCHEMA_JSON = {
  type: "object" as const,
  properties: {
    projectName: { type: "string", minLength: 1, maxLength: 80 },
    industry: { type: "string", enum: ["it", "finance", "law", "sales"] },
    headcount: { type: "integer", minimum: 1, maximum: 2000 },
    city: { type: "string", minLength: 1, maxLength: 60 },
    reasoning: { type: "string", maxLength: 400 },
    items: {
      type: "array",
      minItems: 3,
      maxItems: 40,
      items: {
        type: "object",
        properties: {
          itemId: { type: "string" },
          variantId: { type: ["string", "null"] },
          quantity: { type: "integer", minimum: 1, maximum: 500 },
          mode: { type: "string", enum: ["new", "used"] },
          rationale: { type: "string", maxLength: 120 },
        },
        required: ["itemId", "variantId", "quantity", "mode", "rationale"],
      },
    },
  },
  required: ["projectName", "industry", "headcount", "city", "reasoning", "items"],
};

export async function callClaudeForProposal(args: CallClaudeArgs): Promise<CallClaudeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      proposal: null,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costOre: 0,
      rawError: "anthropic_api_key_missing",
    };
  }

  const client = new Anthropic();
  const systemText = await buildAiSystemPrompt();

  const localeHint =
    args.locale === "sv"
      ? "The user wrote in Swedish. Respond with Swedish projectName, reasoning, and rationales."
      : "The user wrote in English. Respond with English projectName, reasoning, and rationales.";

  try {
    const response = await client.messages.create({
      model: args.model,
      max_tokens: 16000,
      system: [
        { type: "text", text: systemText, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: localeHint },
      ],
      messages: [{ role: "user", content: args.prompt }],
      tools: [
        {
          name: "submit_office_proposal",
          description: "Submit the structured office proposal once you've decided on the items, quantities, and reasoning.",
          input_schema: PROPOSAL_SCHEMA_JSON,
        },
      ],
      tool_choice: { type: "tool", name: "submit_office_proposal" },
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
    const cacheWriteTokens = response.usage.cache_creation_input_tokens ?? 0;
    const costOre = computeAiCostOre(args.model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens);

    const toolUseBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return {
        proposal: null,
        usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens },
        costOre,
        rawError: "no_tool_use_block",
      };
    }

    const parsed = PROPOSAL_SCHEMA.safeParse(toolUseBlock.input);
    if (!parsed.success) {
      return {
        proposal: null,
        usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens },
        costOre,
        rawError: `zod_parse_failed: ${parsed.error.message.slice(0, 200)}`,
      };
    }

    return {
      proposal: parsed.data,
      usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens },
      costOre,
    };
  } catch (err) {
    return {
      proposal: null,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costOre: 0,
      rawError: err instanceof Error ? err.message.slice(0, 200) : "unknown_error",
    };
  }
}
