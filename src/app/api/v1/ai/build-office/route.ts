import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ai-rate-limit";
import { callClaudeForProposal, validateProposal, createProjectFromProposal } from "@/server/ai-build-office";

const requestSchema = z.object({
  prompt: z.string().min(8, "prompt_too_short").max(2000, "prompt_too_long"),
  locale: z.string().length(2).default("en"),
});

export async function POST(req: Request) {
  const startedAt = Date.now();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ai_disabled", message: "AI office builder is not configured on this deployment" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsedReq = requestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json({ error: "invalid_request", details: parsedReq.error.flatten() }, { status: 400 });
  }
  const { prompt, locale } = parsedReq.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rate.retryAfterSec, remaining: rate.remaining },
      { status: 429, headers: rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined },
    );
  }

  const model = process.env.AI_BUILD_MODEL ?? "claude-opus-4-7";
  const result = await callClaudeForProposal({ prompt, locale, model });
  const latencyMs = Date.now() - startedAt;

  if (!result.proposal) {
    await db.aiBuildLog.create({
      data: {
        prompt,
        locale,
        model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        cacheWriteTokens: result.usage.cacheWriteTokens,
        costOre: result.costOre,
        latencyMs,
        rejected: true,
        errorMessage: result.rawError ?? "unknown",
        buyerIp: ip,
      },
    });
    return NextResponse.json(
      { error: "build_failed", reason: result.rawError ?? "unknown" },
      { status: 502 },
    );
  }

  const validation = await validateProposal(result.proposal);
  if (!validation.ok) {
    await db.aiBuildLog.create({
      data: {
        prompt,
        locale,
        model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        cacheWriteTokens: result.usage.cacheWriteTokens,
        costOre: result.costOre,
        latencyMs,
        rejected: true,
        errorMessage: `invalid_ids: items=${validation.invalidItemIds.join(",")} variants=${validation.invalidVariantIds.join(",")} mismatched=${validation.mismatchedVariantItemIds.join(",")}`.slice(0, 500),
        buyerIp: ip,
      },
    });
    return NextResponse.json({ error: "hallucinated_ids", validation }, { status: 502 });
  }

  const { projectId } = await createProjectFromProposal(result.proposal);

  await db.aiBuildLog.create({
    data: {
      projectId,
      prompt,
      locale,
      model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      cacheReadTokens: result.usage.cacheReadTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      costOre: result.costOre,
      latencyMs,
      rejected: false,
      buyerIp: ip,
    },
  });

  return NextResponse.json({
    projectId,
    reasoning: result.proposal.reasoning,
    itemCount: result.proposal.items.length,
    industry: result.proposal.industry,
    headcount: result.proposal.headcount,
    city: result.proposal.city,
  });
}
