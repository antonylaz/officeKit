import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashPassword returns a non-empty string different from input", async () => {
    const h = await hashPassword("hunter2!");
    expect(h).toBeTruthy();
    expect(h).not.toBe("hunter2!");
    expect(h.length).toBeGreaterThan(20);
  });

  it("verifyPassword returns true for correct password", async () => {
    const h = await hashPassword("correctHorseBattery");
    expect(await verifyPassword("correctHorseBattery", h)).toBe(true);
  });

  it("verifyPassword returns false for incorrect password", async () => {
    const h = await hashPassword("correctHorseBattery");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("two hashes of the same password are different (salted)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});
