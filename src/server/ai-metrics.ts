import { db } from "@/lib/db";

export interface AiUsageMetrics {
  buildsToday: number;
  buildsWeek: number;
  buildsMonth: number;
  avgCostOreToday: number;
  avgLatencyMsToday: number;
  rejectionRatePct: number;        // 0-100, last 30 days
  totalCostOreMonth: number;
}

export async function getAiUsageMetrics(): Promise<AiUsageMetrics> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [today, week, month, costAggToday, costAggMonth, rejectionAgg] = await Promise.all([
    db.aiBuildLog.count({ where: { createdAt: { gte: startOfToday } } }),
    db.aiBuildLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.aiBuildLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.aiBuildLog.aggregate({
      where: { createdAt: { gte: startOfToday } },
      _avg: { costOre: true, latencyMs: true },
    }),
    db.aiBuildLog.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { costOre: true },
    }),
    db.aiBuildLog.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true, rejected: true },
    }),
  ]);

  const totalThirtyDays = rejectionAgg._count._all;
  const rejectedCount = await db.aiBuildLog.count({
    where: { createdAt: { gte: thirtyDaysAgo }, rejected: true },
  });

  return {
    buildsToday: today,
    buildsWeek: week,
    buildsMonth: month,
    avgCostOreToday: Math.round(costAggToday._avg.costOre ?? 0),
    avgLatencyMsToday: Math.round(costAggToday._avg.latencyMs ?? 0),
    rejectionRatePct: totalThirtyDays > 0 ? Math.round((rejectedCount / totalThirtyDays) * 100) : 0,
    totalCostOreMonth: costAggMonth._sum.costOre ?? 0,
  };
}
