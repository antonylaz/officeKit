import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { Resend as ResendClient } from "resend";
import { db } from "@/lib/db";
import { MagicLinkEmail } from "@/emails/MagicLink";
import { verifyPassword } from "@/lib/password";
import { decryptSecret, verifyToken, verifyRecoveryCode } from "@/lib/totp";

const resend = new ResendClient(process.env.RESEND_API_KEY!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
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
    Credentials({
      name: "supplier-credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "TOTP or recovery code", type: "text" },
        useRecovery: { label: "Use recovery code", type: "hidden" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        const code = String(creds?.totp ?? "");
        const useRecovery = String(creds?.useRecovery ?? "") === "true";
        if (!email || !password) return null;

        const user = await db.user.findFirst({
          where: { email, role: { in: ["supplier", "admin"] } },
        });
        if (!user || !user.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        if (user.twoFaEnabled) {
          if (!code) return null;
          if (useRecovery) {
            const idx = await findMatchingRecoveryCode(code, user.twoFaRecoveryCodes);
            if (idx < 0) return null;
            const remaining = [...user.twoFaRecoveryCodes];
            remaining.splice(idx, 1);
            await db.user.update({ where: { id: user.id }, data: { twoFaRecoveryCodes: remaining } });
          } else {
            if (!user.twoFaSecret) return null;
            const secret = decryptSecret(user.twoFaSecret);
            if (!verifyToken(secret, code)) return null;
          }
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role, supplierId: user.supplierId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.supplierId = (user as { supplierId?: string | null }).supplierId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { supplierId?: string | null }).supplierId = token.supplierId as string | null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const { claimAnonymousProjects } = await import("@/server/claim");
      if (user.id) await claimAnonymousProjects(user.id);
    },
  },
});

async function findMatchingRecoveryCode(code: string, hashed: string[]): Promise<number> {
  for (let i = 0; i < hashed.length; i++) {
    if (await verifyRecoveryCode(code, hashed[i]!)) return i;
  }
  return -1;
}
