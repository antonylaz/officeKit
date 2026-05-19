import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentForm } from "@/components/buyer/PaymentForm";

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cs?: string }> }) {
  const { id } = await params;
  const { cs } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();
  const order = await db.order.findFirst({
    where: { id, company: { createdByUserId: session.user.id } },
    include: { supplier: true },
  });
  if (!order) notFound();
  if (!cs) notFound();

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36 }}>Complete payment</h1>
      <p style={{ color: "var(--color-ink-soft)", marginTop: 8 }}>
        {order.supplier.name} · {(order.totalAmount / 100).toLocaleString("sv-SE")} kr inkl. moms
      </p>
      <PaymentForm clientSecret={cs} publishableKey={publishableKey} returnUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sv/orders/${id}`} />
    </div>
  );
}
