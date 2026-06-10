import { Lock, AlertCircle } from "lucide-react";
import { getLocale } from "next-intl/server";
import { checkResetToken } from "@/server/password-reset";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Link } from "@/i18n/routing";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const locale = (await getLocale()) as "sv" | "en";
  const token = sp.token ?? "";
  const status = await checkResetToken(token);

  const ui =
    locale === "sv"
      ? {
          eyebrow: "Återställ lösenord",
          title: "Välj ett nytt lösenord",
          subtitle: "Skriv in ett nytt lösenord nedan. Minst 8 tecken.",
          invalidTitle: "Länken är inte giltig",
          invalidBody:
            "Den här återställningslänken har redan använts, gått ut, eller är felaktig. Begär en ny länk om du fortfarande behöver återställa lösenordet.",
          requestNew: "Begär ny länk",
        }
      : {
          eyebrow: "Reset password",
          title: "Choose a new password",
          subtitle: "Enter a new password below. At least 8 characters.",
          invalidTitle: "This link isn't valid",
          invalidBody:
            "This reset link has already been used, expired, or is malformed. Request a new one if you still need to reset.",
          requestNew: "Request new link",
        };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-2">
          <div
            className="inline-flex size-12 items-center justify-center rounded-xl mb-5"
            style={{
              background: status === "valid" ? "rgba(15, 22, 18, 0.05)" : "rgba(184, 66, 28, 0.08)",
              color: status === "valid" ? "var(--color-ink)" : "var(--color-terracotta)",
            }}
          >
            {status === "valid" ? <Lock className="size-5" /> : <AlertCircle className="size-5" />}
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
            {status === "valid" ? ui.title : ui.invalidTitle}
          </h1>
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
            {status === "valid" ? ui.subtitle : ui.invalidBody}
          </p>
        </div>
        <div
          className="mt-8 rounded-2xl border p-7 bg-white shadow-sm"
          style={{ borderColor: "var(--color-line)" }}
        >
          {status === "valid" ? (
            <ResetPasswordForm token={token} locale={locale} />
          ) : (
            <Link
              href="/forgot-password"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white text-xs uppercase tracking-[0.12em] font-semibold shadow-sm hover:shadow-md transition-all"
              style={{ background: "var(--color-cta)" }}
            >
              {ui.requestNew}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
