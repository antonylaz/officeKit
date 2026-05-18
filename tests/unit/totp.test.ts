import { describe, expect, it, beforeAll } from "vitest";
import * as OTPAuth from "otpauth";
import {
  generateSecret,
  encryptSecret,
  decryptSecret,
  verifyToken,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  generateOtpAuthUrl,
} from "@/lib/totp";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-32-chars-minimum-padding-1234";
});

describe("totp", () => {
  it("generateSecret returns a base32 string >= 16 chars", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThanOrEqual(16);
  });

  it("encrypt + decrypt round-trips", () => {
    const s = generateSecret();
    const enc = encryptSecret(s);
    expect(enc).not.toBe(s);
    expect(decryptSecret(enc)).toBe(s);
  });

  it("encrypt produces different output each call (random IV)", () => {
    const s = generateSecret();
    expect(encryptSecret(s)).not.toBe(encryptSecret(s));
  });

  it("verifyToken accepts a fresh code from the same secret", () => {
    const s = generateSecret();
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s) });
    const code = totp.generate();
    expect(verifyToken(s, code)).toBe(true);
  });

  it("verifyToken rejects a clearly wrong code", () => {
    const s = generateSecret();
    expect(verifyToken(s, "000000")).toBe(false);
  });

  it("generateRecoveryCodes returns N unique uppercase codes of correct length", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    for (const c of codes) {
      expect(c).toMatch(/^[A-HJ-NP-Z0-9]{10}$/);
    }
    expect(new Set(codes).size).toBe(8);
  });

  it("hashRecoveryCode + verifyRecoveryCode round-trips", async () => {
    const code = generateRecoveryCodes(1)[0]!;
    const hashed = await hashRecoveryCode(code);
    expect(hashed).not.toBe(code);
    expect(await verifyRecoveryCode(code, hashed)).toBe(true);
    expect(await verifyRecoveryCode("WRONG12345", hashed)).toBe(false);
  });

  it("generateOtpAuthUrl produces a parseable otpauth URL", () => {
    const url = generateOtpAuthUrl("user@example.com", "JBSWY3DPEHPK3PXP");
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain("user%40example.com");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
  });
});
