import { db } from "@/lib/db";
import { canTransitionStatus, isWithinCancelWindow } from "./order-state";
import { getStripe, mockId, stripeEnabled } from "@/lib/stripe";
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
  const order = await db.order.findFirst({ where: { id: orderId, supplierId }, include: { supplier: true } });
  if (!order) throw new Error("not_found");
  if (!canTransitionStatus(order.status, to)) throw new Error("invalid_transition");

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      status: to,
      trackingNumber: to === "shipped" && trackingNumber ? trackingNumber : undefined,
      deliveredAt: to === "delivered" ? new Date() : undefined,
    },
  });

  // Fire-and-forget buyer status notification — never blocks the transition
  void (async () => {
    const { notifyBuyerOrderStatus } = await import("@/server/buyer-notifications");
    await notifyBuyerOrderStatus(orderId, to);
  })();

  // Fire payout transfer on delivery
  if (to === "delivered" && !order.stripeTransferId) {
    let transferId: string;
    if (stripeEnabled && order.supplier.stripeAccountId && !order.supplier.stripeAccountId.includes("_stub_")) {
      try {
        const stripe = getStripe()!;
        const transfer = await stripe.transfers.create({
          amount: order.payoutAmount,
          currency: "sek",
          destination: order.supplier.stripeAccountId,
          transfer_group: order.id,
          metadata: { orderId: order.id },
        });
        transferId = transfer.id;
      } catch (e) {
        console.error("Transfer creation failed for order", orderId, (e as Error).message);
        return updated; // Don't block the status transition on transfer failure
      }
    } else {
      transferId = mockId("tr");
      // In stub mode, also immediately move to paid (no webhook will arrive)
    }
    await db.order.update({
      where: { id: orderId },
      data: {
        stripeTransferId: transferId,
        // Auto-mark paid in stub mode (real mode waits for transfer.paid webhook)
        status: stripeEnabled ? "delivered" : "paid",
      },
    });
  }

  return updated;
}

export async function cancelOrder(orderId: string, supplierId: string, reason: string) {
  const order = await db.order.findFirst({ where: { id: orderId, supplierId } });
  if (!order) throw new Error("not_found");
  if (order.status === "delivered" || order.status === "paid") throw new Error("already_delivered");
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
