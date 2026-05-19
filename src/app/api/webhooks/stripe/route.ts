import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: Request) {
  if (!stripeEnabled) {
    return NextResponse.json({ stubbed: true }, { status: 200 });
  }
  const stripe = getStripe()!;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook_secret_missing" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no_signature" }, { status: 400 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `bad_signature: ${(e as Error).message}` }, { status: 400 });
  }

  try {
    // Use string comparison to support event types that may not be in the SDK union yet
    const eventType = event.type as string;
    switch (eventType) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          // Order remains in 'confirmed' status — buyer-side payment confirmed.
          // Could mark a paidByBuyerAt timestamp on Order if needed (skip for v1).
          console.log(`PI succeeded for order ${orderId}`);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await db.order.update({ where: { id: orderId }, data: { status: "cancelled", cancelledAt: new Date(), cancelReason: "payment_failed" } });
        }
        break;
      }
      case "transfer.created": {
        const tr = event.data.object as Stripe.Transfer;
        const orderId = (tr.metadata as Record<string, string>)?.orderId;
        if (orderId) {
          await db.order.update({ where: { id: orderId }, data: { stripeTransferId: tr.id } });
        }
        break;
      }
      case "transfer.paid": {
        const tr = event.data.object as Stripe.Transfer;
        const orderId = (tr.metadata as Record<string, string>)?.orderId;
        if (orderId) {
          await db.order.update({ where: { id: orderId }, data: { status: "paid" } });
        }
        break;
      }
      default:
        // Ignore other events
        break;
    }
  } catch (e) {
    console.error("Webhook handler error", (e as Error).message);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
