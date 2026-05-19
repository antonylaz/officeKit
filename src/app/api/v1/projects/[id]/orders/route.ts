import { NextResponse } from "next/server";
import { z } from "zod";
import { placeOrder } from "@/server/orders";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { OrderConfirmationBuyerEmail } from "@/emails/OrderConfirmationBuyer";
import { OrderWonSupplierEmail } from "@/emails/OrderWonSupplier";
import { QuoteNotSelectedEmail } from "@/emails/QuoteNotSelected";

const addrSchema = z.object({
  street: z.string().min(1),
  postal: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(2).default("SE"),
});

const schema = z.object({
  quoteId: z.string().uuid(),
  billing: z.object({
    companyName: z.string().min(1),
    orgNumber: z.string().min(1),
    address: addrSchema,
  }),
  deliveryAddress: addrSchema,
  deliveryWindowStart: z.string().datetime(),
  deliveryWindowEnd: z.string().datetime(),
  paymentMethod: z.enum(["card", "klarna_invoice"]),
  lostReason: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let order, winningSupplier, clientSecret: string | null;
  try {
    const result = await placeOrder({
      projectId: id,
      quoteId: parsed.data.quoteId,
      billing: parsed.data.billing,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryWindowStart: new Date(parsed.data.deliveryWindowStart),
      deliveryWindowEnd: new Date(parsed.data.deliveryWindowEnd),
      paymentMethod: parsed.data.paymentMethod,
      lostReasonForLosers: parsed.data.lostReason,
    });
    order = result.order;
    winningSupplier = result.winningSupplier;
    clientSecret = result.clientSecret;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (apiKey && from && !apiKey.startsWith("re_xxx")) {
    const resend = new Resend(apiKey);
    const session = await auth();
    const buyerEmail = session?.user?.email;
    try {
      if (buyerEmail) {
        await resend.emails.send({
          from, to: buyerEmail, subject: "OfficeKit — beställning bekräftad",
          react: OrderConfirmationBuyerEmail({ orderId: order.id, supplierName: winningSupplier.name, locale: "sv" }),
        });
      }
      const winnerUser = await db.user.findFirst({ where: { supplierId: winningSupplier.id, role: "supplier" } });
      const company = await db.company.findUnique({ where: { id: order.companyId } });
      if (winnerUser?.email && company) {
        await resend.emails.send({
          from, to: winnerUser.email,
          subject: winnerUser.locale === "sv" ? "Du har vunnit en beställning" : "You won an order",
          react: OrderWonSupplierEmail({ orderId: order.id, companyName: company.name, totalAmountKr: Math.round(order.totalAmount / 100), url: `${appUrl}/${winnerUser.locale}/supplier/orders/${order.id}`, locale: winnerUser.locale }),
        });
      }
      const losers = await db.rfq.findMany({ where: { projectId: id, status: "lost" }, include: { supplier: true } });
      for (const l of losers) {
        const loserUser = await db.user.findFirst({ where: { supplierId: l.supplierId, role: "supplier" } });
        if (!loserUser?.email || !company) continue;
        await resend.emails.send({
          from, to: loserUser.email,
          subject: loserUser.locale === "sv" ? "Din offert valdes inte" : "Your quote wasn't selected",
          react: QuoteNotSelectedEmail({ companyName: company.name, reason: l.lostReason, locale: loserUser.locale }),
        });
      }
    } catch (e) {
      console.error("Order email send failed:", (e as Error).message);
    }
  }

  return NextResponse.json({ orderId: order.id, clientSecret });
}
