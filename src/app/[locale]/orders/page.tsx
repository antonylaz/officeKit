import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/routing";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect({ href: "/", locale: "sv" });
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
      <p style={{ fontSize: 64 }}>📦</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 16 }}>No orders yet</h1>
      <p style={{ color: "var(--color-ink-mute)", marginTop: 8 }}>Your placed orders will appear here once you accept a quote.</p>
    </div>
  );
}
