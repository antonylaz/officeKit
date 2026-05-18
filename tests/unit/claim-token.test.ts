import { describe, expect, it } from "vitest";
import { generateClaimToken, isValidClaimToken } from "@/lib/claim-token";

describe("claim-token", () => {
  it("generates a URL-safe token", () => {
    const t = generateClaimToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateClaimToken()));
    expect(tokens.size).toBe(100);
  });

  it("isValidClaimToken rejects empty, short, or non-base64url strings", () => {
    expect(isValidClaimToken("")).toBe(false);
    expect(isValidClaimToken("abc")).toBe(false);
    expect(isValidClaimToken("has spaces inside!!")).toBe(false);
    expect(isValidClaimToken(generateClaimToken())).toBe(true);
  });
});
