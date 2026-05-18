import * as OTPAuth from "otpauth";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

const ALGO = "aes-256-gcm";
const RECOVERY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.alloc(0), Buffer.from("totp-key"), 32));
}

export function generateSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB, ctB, tagB] = payload.split(".");
  if (!ivB || !ctB || !tagB) throw new Error("invalid encrypted payload");
  const iv = Buffer.from(ivB, "base64url");
  const ct = Buffer.from(ctB, "base64url");
  const tag = Buffer.from(tagB, "base64url");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function verifyToken(secretBase32: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function generateRecoveryCodes(n: number): string[] {
  const codes: string[] = [];
  while (codes.length < n) {
    const buf = randomBytes(10);
    let s = "";
    for (let i = 0; i < 10; i++) s += RECOVERY_CHARS[buf[i]! % RECOVERY_CHARS.length];
    if (!codes.includes(s)) codes.push(s);
  }
  return codes;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function generateOtpAuthUrl(email: string, secretBase32: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "OfficeKit",
    label: email,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}
