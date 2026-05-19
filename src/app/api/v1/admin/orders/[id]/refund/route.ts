import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getStripe, mockId, stripeEnabled } from "@/lib/stripe";

const schema = z.object({
  amount: z.number().int().positive().optional(),  // partial refund in öre
  reason: z.string().min(1).max(500),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!order.stripePaymentIntentId) return NextResponse.json({ error: "no_payment_intent" }, { status: 400 });

  const refundAmount = parsed.data.amount ?? order.totalAmount;
  const fullRefund = refundAmount >= order.totalAmount;

  let refundId: string;
  if (stripeEnabled && !order.stripePaymentIntentId.includes("_stub_")) {
    try {
      const stripe = getStripe()!;
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: refundAmount,
        metadata: { orderId: id, reason: parsed.data.reason },
      });
      refundId = refund.id;
    } catch (e) {
      return NextResponse.json({ error: `stripe_refund_failed: ${(e as Error).message}` }, { status: 502 });
    }
  } else {
    refundId = mockId("re");
  }

  if (fullRefund) {
    await db.order.update({
      where: { id },
      data: { status: "cancelled", cancelledAt: new Date(), cancelReason: parsed.data.reason },
    });
  }

  return NextResponse.json({ refundId, fullRefund });
}
