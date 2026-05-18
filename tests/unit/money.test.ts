import { describe, expect, it } from "vitest";
import { fromSek, toSek, formatSek, addVat, removeVat, VAT_RATE } from "@/lib/money";

describe("money", () => {
  describe("fromSek / toSek", () => {
    it("converts SEK to integer öre", () => {
      expect(fromSek(100)).toBe(10_000);
      expect(fromSek(1.5)).toBe(150);
    });

    it("rounds half-up on conversion", () => {
      expect(fromSek(0.005)).toBe(1);
      expect(fromSek(0.004)).toBe(0);
    });

    it("round-trips through öre and back", () => {
      expect(toSek(fromSek(1234.56))).toBe(1234.56);
    });
  });

  describe("addVat / removeVat", () => {
    it("adds 25% VAT to a base amount in öre", () => {
      expect(addVat(10_000)).toBe(12_500);
    });

    it("removes 25% VAT from a gross amount in öre", () => {
      expect(removeVat(12_500)).toBe(10_000);
    });

    it("VAT_RATE constant equals 0.25", () => {
      expect(VAT_RATE).toBe(0.25);
    });
  });

  describe("formatSek", () => {
    it("formats öre as Swedish currency string", () => {
      const out = formatSek(123_456_700);
      // contains the digits with sv-SE thin spaces
      expect(out).toMatch(/1[\s   ]234[\s   ]567/);
      expect(out.toLowerCase()).toContain("kr");
    });
  });
});
