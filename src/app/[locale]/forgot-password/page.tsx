import { KeyRound } from "lucide-react";
import { getLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const locale = (await getLocale()) as "sv" | "en";
  const ui =
    locale === "sv"
      ? {
          eyebrow: "Lösenord",
          title: "Glömt lösenord?",
          subtitle:
            "Skriv in din e-postadress så skickar vi en länk för att återställa det.",
        }
      : {
          eyebrow: "Password",
          title: "Forgot password?",
          subtitle: "Enter your email and we'll send you a link to reset it.",
        };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-2">
          <div
            className="inline-flex size-12 items-center justify-center rounded-xl mb-5"
            style={{ background: "rgba(15, 22, 18, 0.05)", color: "var(--color-ink)" }}
          >
            <KeyRound className="size-5" />
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
          <ForgotPasswordForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
