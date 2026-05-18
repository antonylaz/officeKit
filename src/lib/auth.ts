import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { Resend as ResendClient } from "resend";
import { db } from "@/lib/db";
import { MagicLinkEmail } from "@/emails/MagicLink";

const resend = new ResendClient(process.env.RESEND_API_KEY!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: { signIn: "/sv/login", verifyRequest: "/sv/login/check-email" },
  providers: [
    Resend({
      from: process.env.RESEND_FROM_EMAIL!,
      async sendVerificationRequest({ identifier: email, url }) {
        const locale = url.includes("/en/") ? "en" : "sv";
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: email,
          subject: locale === "sv" ? "Logga in på OfficeKit" : "Sign in to OfficeKit",
          react: MagicLinkEmail({ url, locale }),
        });
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      const { claimAnonymousProjects } = await import("@/server/claim");
      if (user.id) await claimAnonymousProjects(user.id);
    },
  },
});
