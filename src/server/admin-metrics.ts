import { db } from "@/lib/db";

export interface FunnelCounts {
  rfqsSent: number;
  quotesReceived: number;
  ordersPlaced: number;
}

export function computeFunnelRates(f: FunnelCounts) {
  return {
    quoteRate: f.rfqsSent === 0 ? 0 : f.quotesReceived / f.rfqsSent,
    orderRate: f.quotesReceived === 0 ? 0 : f.ordersPlaced / f.quotesReceived,
  };
}

export interface AdminMetrics {
  gmvThisMonthOre: number;
  gmvYtdOre: number;
  activeSuppliers: number;
  openRfqs: number;
  funnel: FunnelCounts;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [gmvThisMonth, gmvYtd, activeSuppliers, openRfqs, rfqsSent, quotesReceived, ordersPlaced] = await Promise.all([
    db.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "cancelled" }, createdAt: { gte: monthStart } } }),
    db.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "cancelled" }, createdAt: { gte: yearStart } } }),
    db.supplier.count({ where: { active: true } }),
    db.rfq.count({ where: { status: { in: ["sent", "viewed"] }, deadlineAt: { gt: now } } }),
    db.rfq.count({ where: { sentAt: { gte: yearStart } } }),
    db.quote.count({ where: { submittedAt: { gte: yearStart, not: null } } }),
    db.order.count({ where: { createdAt: { gte: yearStart }, status: { not: "cancelled" } } }),
  ]);

  return {
    gmvThisMonthOre: gmvThisMonth._sum.totalAmount ?? 0,
    gmvYtdOre: gmvYtd._sum.totalAmount ?? 0,
    activeSuppliers,
    openRfqs,
    funnel: { rfqsSent, quotesReceived, ordersPlaced },
  };
}
