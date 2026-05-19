import { db } from "@/lib/db";
import type { RfqStatus } from "@prisma/client";

export async function expireStaleRfqs(supplierId: string) {
  await db.rfq.updateMany({
    where: {
      supplierId,
      status: { in: ["sent", "viewed"] },
      deadlineAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });
}

export interface InboxFilter {
  status?: RfqStatus | "all";
  limit?: number;
  offset?: number;
}

export async function listInbox(supplierId: string, filter: InboxFilter = {}) {
  await expireStaleRfqs(supplierId);
  const where: { supplierId: string; status?: RfqStatus } = { supplierId };
  if (filter.status && filter.status !== "all") where.status = filter.status;
  const [rfqs, total] = await Promise.all([
    db.rfq.findMany({
      where,
      include: {
        project: { include: { company: true, items: true } },
        quote: true,
      },
      orderBy: { deadlineAt: "asc" },
      take: filter.limit ?? 50,
      skip: filter.offset ?? 0,
    }),
    db.rfq.count({ where }),
  ]);
  return { rfqs, total };
}

export async function markViewed(rfqId: string, supplierId: string) {
  const result = await db.rfq.updateMany({
    where: { id: rfqId, supplierId, viewedAt: null },
    data: { status: "viewed", viewedAt: new Date() },
  });
  return result.count > 0;
}

export async function getRfqDetail(rfqId: string, supplierId: string) {
  return db.rfq.findFirst({
    where: { id: rfqId, supplierId },
    include: {
      project: { include: { company: true, items: { include: { item: true } } } },
      supplier: true,
      quote: { include: { lines: { include: { item: true } } } },
    },
  });
}
