import { randomBytes } from "node:crypto";

export const CLAIM_TOKEN_COOKIE = "officekit_claim";
export const CLAIM_TOKEN_TTL_DAYS = 30;

export function generateClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidClaimToken(t: string): boolean {
  return /^[A-Za-z0-9_-]{32,}$/.test(t);
}
