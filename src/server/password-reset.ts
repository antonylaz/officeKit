import { randomBytes, createHash } from "node:crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PasswordResetEmail } from "@/emails/PasswordReset";

const TOKEN_TTL_MIN = 30;
const TOKEN_BYTES = 32; // 256-bit, encoded as base64url

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/**
 * Request a password reset. Always returns a generic success envelope to the
 * caller — never leaks whether the email exists. Soft-fails if Resend is
 * unconfigured (logs only).
 */
export async function requestPasswordReset(
  email: string,
  locale: "sv" | "en" = "sv",
  requestIp?: string,
): Promise<{ ok: true }> {
  const lower = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) return { ok: true };

  // Only allow reset for users that actually have a password (i.e. credentials-based)
  const user = await db.user.findFirst({
    where: { email: lower, passwordHash: { not: null } },
  });
  if (!user) return { ok: true };

  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000);

  await db.passwordResetToken.create({
    data: {
      tokenHash: sha256(raw),
      userId: user.id,
      expiresAt,
      requestIp: requestIp ?? null,
    },
  });

  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const resetUrl = `${appUrl()}/${locale}/reset-password?token=${raw}`;
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: user.email,
        subject:
          locale === "sv" ? "Återställ ditt lösenord" : "Reset your password",
        react: PasswordResetEmail({
          resetUrl,
          expiresInMinutes: TOKEN_TTL_MIN,
          locale,
        }),
      });
    } catch (err) {
      console.error("password reset email failed:", err);
    }
  }

  return { ok: true };
}

export type ResetTokenStatus = "valid" | "expired" | "used" | "invalid";

export async function checkResetToken(rawToken: string): Promise<ResetTokenStatus> {
  if (!rawToken || rawToken.length < 16) return "invalid";
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
  });
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  return "valid";
}

/**
 * Consume a reset token to set a new password. Atomic — marks the token used
 * and updates the password in one transaction.
 */
export async function consumeResetToken(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: ResetTokenStatus | "weak_password" }> {
  if (newPassword.length < 8) return { ok: false, error: "weak_password" };
  const status = await checkResetToken(rawToken);
  if (status !== "valid") return { ok: false, error: status };

  const tokenHash = sha256(rawToken);
  const row = await db.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });
  const passwordHash = await hashPassword(newPassword);

  await db.$transaction([
    db.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
    // Invalidate sibling tokens for this user — only one fresh reset at a time
    db.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, tokenHash: { not: tokenHash } },
      data: { usedAt: new Date() },
    }),
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
  ]);

  return { ok: true };
}
