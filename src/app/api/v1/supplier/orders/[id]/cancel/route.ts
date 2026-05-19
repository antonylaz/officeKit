import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupplier } from "@/lib/supplier-auth";
import { cancelOrder } from "@/server/supplier-orders";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { OrderCancelledBuyerEmail } from "@/emails/OrderCancelledBuyer";

const schema = z.object({ reason: z.string().min(1).max(500) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supplierId } = await requireSupplier();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let order;
  try {
    order = await cancelOrder(id, supplierId, parsed.data.reason);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (apiKey && from && !apiKey.startsWith("re_xxx")) {
    try {
      const resend = new Resend(apiKey);
      const project = await db.project.findUniqueOrThrow({
        where: { id: order.projectId },
        include: { company: { include: { createdByUser: true } } },
      });
      const winningQuote = await db.quote.findUnique({ where: { id: order.quoteId }, include: { rfq: { include: { supplier: true } } } });
      const buyer = project.company.createdByUser;
      if (buyer?.email && winningQuote?.rfq.supplier) {
        await resend.emails.send({
          from, to: buyer.email,
          subject: buyer.locale === "sv" ? "Din OfficeKit-beställning har avbokats" : "Your OfficeKit order was cancelled",
          react: OrderCancelledBuyerEmail({
            supplierName: winningQuote.rfq.supplier.name, reason: parsed.data.reason,
            projectUrl: `${appUrl}/${buyer.locale}/projects/${order.projectId}/quotes`,
            locale: buyer.locale,
          }),
        });
      }
    } catch (e) {
      console.error("Cancel email failed:", (e as Error).message);
    }
  }

  return NextResponse.json({ order });
}
