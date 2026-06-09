import { Mail, Shield, CheckCircle2 } from "lucide-react";
import { getLocale } from "next-intl/server";
import { bankidEnabled } from "@/lib/auth";
import { SignInForm } from "@/components/auth/SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const locale = (await getLocale()) as "sv" | "en";
  const sent = sp.sent === "1";
  const callbackUrl = sp.callbackUrl ?? `/${locale}/projects`;

  const ui =
    locale === "sv"
      ? {
          eyebrow: "Logga in",
          title: "Välkommen tillbaka",
          subtitle: "Få en magisk länk via e-post — inget lösenord behövs.",
          orDivider: "eller",
          bankidLabel: "Logga in med BankID",
          bankidUnavailable: "BankID är inte konfigurerad i denna miljö",
          sentTitle: "Kolla din inkorg",
          sentBody:
            "Vi har skickat en magisk länk. Klicka på den för att logga in. Länken är giltig i 24 timmar.",
          guestNote:
            "Har du sparade projekt? De kopplas automatiskt till ditt konto när du loggar in.",
        }
      : {
          eyebrow: "Sign in",
          title: "Welcome back",
          subtitle: "Get a magic link by email — no password needed.",
          orDivider: "or",
          bankidLabel: "Sign in with BankID",
          bankidUnavailable: "BankID is not configured on this deployment",
          sentTitle: "Check your inbox",
          sentBody:
            "We've sent you a magic link. Click it to sign in. The link is valid for 24 hours.",
          guestNote:
            "Have saved projects? They'll be linked to your account automatically when you sign in.",
        };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-2">
          <div
            className="inline-flex size-12 items-center justify-center rounded-xl mb-5"
            style={{ background: "rgba(15, 22, 18, 0.05)", color: "var(--color-ink)" }}
          >
            <Mail className="size-5" />
          </div>
          <p
            className="text-[11px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {ui.eyebrow}
          </p>
          <h1
            className="mt-3 text-4xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {ui.title}
          </h1>
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
            {ui.subtitle}
          </p>
        </div>

        <div
          className="mt-8 rounded-2xl border p-7 bg-white shadow-sm"
          style={{ borderColor: "var(--color-line)" }}
        >
          {sent ? (
            <div className="text-center py-2">
              <div
                className="mx-auto size-12 rounded-full inline-flex items-center justify-center"
                style={{ background: "rgba(74, 107, 82, 0.15)", color: "var(--color-green-leaf)" }}
              >
                <CheckCircle2 className="size-6" />
              </div>
              <h2
                className="mt-4 text-2xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {ui.sentTitle}
              </h2>
              <p
                className="mt-3 text-[14px] leading-relaxed"
                style={{ color: "var(--color-ink-soft)" }}
              >
                {ui.sentBody}
              </p>
            </div>
          ) : (
            <SignInForm
              callbackUrl={callbackUrl}
              bankidEnabled={bankidEnabled}
              bankidLabel={ui.bankidLabel}
              bankidUnavailable={ui.bankidUnavailable}
              orDivider={ui.orDivider}
              locale={locale}
            />
          )}
        </div>

        <p
          className="mt-6 text-center text-[12px] inline-flex items-center gap-1.5 w-full justify-center"
          style={{ color: "var(--color-ink-mute)" }}
        >
          <Shield className="size-3" />
          {ui.guestNote}
        </p>
      </div>
    </div>
  );
}
