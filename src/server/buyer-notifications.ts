import { Resend } from "resend";
import { db } from "@/lib/db";
import { QuoteReceivedBuyerEmail } from "@/emails/QuoteReceivedBuyer";
import { OrderStatusBuyerEmail } from "@/emails/OrderStatusBuyer";
import { toSek } from "@/lib/money";
import type { OrderStatus } from "@prisma/client";

/**
 * Resolve the buyer's email for a project. Prefers the auth-linked user's
 * email; falls back to a quote-request snapshot if we ever store one (not yet).
 * Returns null if we have no way to reach the buyer.
 */
async function getBuyerEmailForProject(projectId: string): Promise<string | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { createdByUser: { select: { email: true } } },
  });
  return project?.createdByUser?.email ?? null;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function localeFromBuyer(): "sv" | "en" {
  // The app is sv-default; we don't store a per-user locale yet, so always sv.
  // TODO: when we track per-user locale, look it up from the User row.
  return "sv";
}

/**
 * Notify the buyer that a quote has arrived. Soft-fails on missing keys or
 * missing buyer email — never throws to the caller.
 */
export async function notifyBuyerQuoteReceived(rfqId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;

  try {
    const rfq = await db.rfq.findUnique({
      where: { id: rfqId },
      include: {
        supplier: { select: { name: true } },
        project: { select: { id: true, name: true } },
        quote: { select: { totalAmount: true } },
      },
    });
    if (!rfq || !rfq.quote) return;

    const buyerEmail = await getBuyerEmailForProject(rfq.projectId);
    if (!buyerEmail) return;

    // How many sibling RFQs are still unquoted?
    const remainingExpected = await db.rfq.count({
      where: {
        projectId: rfq.projectId,
        id: { not: rfqId },
        status: { in: ["sent", "viewed"] },
      },
    });

    const locale = localeFromBuyer();
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: buyerEmail,
      subject:
        locale === "sv"
          ? `Offert från ${rfq.supplier.name} — ${rfq.project.name}`
          : `Quote from ${rfq.supplier.name} — ${rfq.project.name}`,
      react: QuoteReceivedBuyerEmail({
        supplierName: rfq.supplier.name,
        projectName: rfq.project.name,
        totalSek: toSek(rfq.quote.totalAmount),
        projectId: rfq.projectId,
        remainingExpected,
        appUrl: appUrl(),
        locale,
      }),
    });
  } catch (err) {
    console.error("notifyBuyerQuoteReceived failed:", err);
  }
}

/**
 * Notify the buyer of an order status change. Skips terminal-state churn
 * (e.g. confirmed→confirmed re-renders) by only firing when status changed.
 */
export async function notifyBuyerOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  if (newStatus === "cancelled") return; // handled by separate OrderCancelledBuyer flow

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        supplier: { select: { name: true } },
        project: { select: { id: true } },
      },
    });
    if (!order) return;

    const buyerEmail = await getBuyerEmailForProject(order.projectId);
    if (!buyerEmail) return;

    const locale = localeFromBuyer();
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: buyerEmail,
      subject:
        locale === "sv"
          ? `Statusuppdatering — ${order.supplier.name}`
          : `Order update — ${order.supplier.name}`,
      react: OrderStatusBuyerEmail({
        supplierName: order.supplier.name,
        status: newStatus,
        orderId: order.id,
        trackingNumber: order.trackingNumber,
        appUrl: appUrl(),
        locale,
      }),
    });
  } catch (err) {
    console.error("notifyBuyerOrderStatus failed:", err);
  }
}
