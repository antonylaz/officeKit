import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { encryptSecret, generateRecoveryCodes, hashRecoveryCode, generateSecret, generateOtpAuthUrl } from "@/lib/totp";
import QRCode from "qrcode";

export async function verifyOnboardingToken(token: string) {
  const user = await db.user.findUnique({
    where: { onboardingToken: token },
    include: { supplier: true },
  });
  if (!user) return null;
  if (!user.onboardingExpiresAt || user.onboardingExpiresAt < new Date()) return null;
  return user;
}

export interface OnboardingPrep {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export async function prepareOnboarding(email: string): Promise<OnboardingPrep> {
  const secret = generateSecret();
  const otpauthUrl = generateOtpAuthUrl(email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrDataUrl };
}

export interface CompleteOnboardingInput {
  token: string;
  password: string;
  totpSecret: string;
  totpToken: string;
}

export interface CompleteOnboardingResult {
  recoveryCodes: string[];
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<CompleteOnboardingResult> {
  const { verifyToken } = await import("@/lib/totp");
  const user = await verifyOnboardingToken(input.token);
  if (!user) throw new Error("invalid_or_expired_token");
  if (input.password.length < 8) throw new Error("password_too_short");
  if (!verifyToken(input.totpSecret, input.totpToken)) throw new Error("invalid_totp");

  const passwordHash = await hashPassword(input.password);
  const encryptedSecret = encryptSecret(input.totpSecret);
  const recoveryPlain = generateRecoveryCodes(8);
  const recoveryHashed = await Promise.all(recoveryPlain.map(hashRecoveryCode));

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      twoFaSecret: encryptedSecret,
      twoFaEnabled: true,
      twoFaRecoveryCodes: recoveryHashed,
      onboardingToken: null,
      onboardingExpiresAt: null,
    },
  });

  return { recoveryCodes: recoveryPlain };
}
