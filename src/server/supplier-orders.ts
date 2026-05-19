import { db } from "@/lib/db";
import { canTransitionStatus, isWithinCancelWindow } from "./order-state";
import type { OrderStatus } from "@prisma/client";

export async function listSupplierOrders(supplierId: string) {
  return db.order.findMany({
    where: { supplierId },
    include: { company: true, project: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSupplierOrder(orderId: string, supplierId: string) {
  return db.order.findFirst({
    where: { id: orderId, supplierId },
    include: { company: true, project: true, quote: { include: { lines: { include: { item: true } } } } },
  });
}

export async function transitionOrderStatus(orderId: string, supplierId: string, to: OrderStatus, trackingNumber?: string) {
  const order = await db.order.findFirst({ where: { id: orderId, supplierId } });
  if (!order) throw new Error("not_found");
  if (!canTransitionStatus(order.status, to)) throw new Error("invalid_transition");
  return db.order.update({
    where: { id: orderId },
    data: {
      status: to,
      trackingNumber: to === "shipped" && trackingNumber ? trackingNumber : undefined,
      deliveredAt: to === "delivered" ? new Date() : undefined,
    },
  });
}

export async function cancelOrder(orderId: string, supplierId: string, reason: string) {
  const order = await db.order.findFirst({ where: { id: orderId, supplierId } });
  if (!order) throw new Error("not_found");
  if (order.status === "delivered") throw new Error("already_delivered");
  if (order.status === "cancelled") throw new Error("already_cancelled");
  if (!isWithinCancelWindow(order.createdAt)) throw new Error("cancel_window_expired");

  return db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason },
    });
    await tx.rfq.updateMany({
      where: { projectId: order.projectId, status: { in: ["won", "lost"] } },
      data: { status: "quoted", decidedAt: null, lostReason: null },
    });
    await tx.project.update({ where: { id: order.projectId }, data: { status: "quotes_received" } });
    return updated;
  });
}
