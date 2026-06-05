import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { fraunces, manrope, jetbrains } from "@/lib/fonts";
import { Header } from "@/components/shell/Header";
import { HeaderUserSlot } from "@/components/shell/HeaderUserSlot";
import { Footer } from "@/components/shell/Footer";
import { Providers } from "@/app/providers";
import "@/app/globals.css";

export const metadata = { title: "OfficeKit", description: "A new office, in two days, from one form." };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "sv" | "en")) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <Header userMenuSlot={<HeaderUserSlot />} />
            <main>{children}</main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
