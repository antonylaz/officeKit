import { db } from "@/lib/db";
import { computeSummary } from "./project-summary";
import type { ItemCategory } from "@prisma/client";

export interface DashboardMetrics {
  openRfqs: number;
  winRate30d: { rate: number; won: number; lost: number };
  pipelineValueOre: number;
  avgResponseTimeMs: number;
  stockMix: Array<{ category: ItemCategory; newCount: number; usedCount: number }>;
  winVsCompetitor: Array<{ supplierId: string; supplierName: string; winRate: number; sample: number }>;
}

export function computeWinRate(won: number, lost: number): number {
  const denom = won + lost;
  if (denom === 0) return 0;
  return won / denom;
}

export function computeAvgResponseMs(diffs: number[]): number {
  if (diffs.length === 0) return 0;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

export async function getDashboardMetrics(supplierId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const openRfqs = await db.rfq.count({
    where: { supplierId, status: { in: ["sent", "viewed"] }, deadlineAt: { gt: now } },
  });

  const decided30d = await db.rfq.findMany({
    where: { supplierId, decidedAt: { gte: thirtyDaysAgo }, status: { in: ["won", "lost"] } },
    select: { status: true },
  });
  const won = decided30d.filter((r) => r.status === "won").length;
  const lost = decided30d.filter((r) => r.status === "lost").length;

  const openRfqsList = await db.rfq.findMany({
    where: { supplierId, status: { in: ["sent", "viewed"] }, deadlineAt: { gt: now } },
    include: { project: { include: { items: { include: { item: true } } } } },
  });
  const pipelineValueOre = openRfqsList.reduce((sum, r) => sum + computeSummary(r.project.items).totalOre, 0);

  const quoted30d = await db.rfq.findMany({
    where: { supplierId, quotedAt: { gte: thirtyDaysAgo } },
    select: { sentAt: true, quotedAt: true },
  });
  const diffs = quoted30d
    .filter((r) => r.quotedAt)
    .map((r) => r.quotedAt!.getTime() - r.sentAt.getTime());
  const avgResponseTimeMs = computeAvgResponseMs(diffs);

  const lines90d = await db.quoteLine.findMany({
    where: { quote: { rfq: { supplierId }, submittedAt: { gte: ninetyDaysAgo } } },
    include: { item: true },
  });
  const stockMixMap = new Map<ItemCategory, { newCount: number; usedCount: number }>();
  for (const l of lines90d) {
    const cur = stockMixMap.get(l.item.category) ?? { newCount: 0, usedCount: 0 };
    if (l.mode === "new") cur.newCount += l.quantity;
    else cur.usedCount += l.quantity;
    stockMixMap.set(l.item.category, cur);
  }
  const stockMix = Array.from(stockMixMap.entries()).map(([category, v]) => ({ category, ...v }));

  const myDecided = await db.rfq.findMany({
    where: { supplierId, status: { in: ["won", "lost"] }, decidedAt: { gte: ninetyDaysAgo } },
    select: { id: true, projectId: true, status: true },
  });
  const projectIds = [...new Set(myDecided.map((r) => r.projectId))];
  const peerRfqs = projectIds.length === 0 ? [] : await db.rfq.findMany({
    where: { projectId: { in: projectIds }, NOT: { supplierId } },
    select: { projectId: true, supplierId: true, supplier: { select: { name: true } } },
  });
  const competitorStats = new Map<string, { name: string; won: number; total: number }>();
  for (const my of myDecided) {
    const peers = peerRfqs.filter((p) => p.projectId === my.projectId);
    for (const p of peers) {
      const cur = competitorStats.get(p.supplierId) ?? { name: p.supplier.name, won: 0, total: 0 };
      cur.total += 1;
      if (my.status === "won") cur.won += 1;
      competitorStats.set(p.supplierId, cur);
    }
  }
  const winVsCompetitor = Array.from(competitorStats.entries())
    .map(([sid, v]) => ({ supplierId: sid, supplierName: v.name, winRate: computeWinRate(v.won, v.total - v.won), sample: v.total }))
    .sort((a, b) => b.sample - a.sample)
    .slice(0, 2);

  return {
    openRfqs,
    winRate30d: { rate: computeWinRate(won, lost), won, lost },
    pipelineValueOre,
    avgResponseTimeMs,
    stockMix,
    winVsCompetitor,
  };
}
