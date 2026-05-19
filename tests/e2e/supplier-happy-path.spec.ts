import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as OTPAuth from "otpauth";
import { createDecipheriv, hkdfSync } from "node:crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://officekit:officekit@localhost:5432/officekit?schema=public",
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

function decryptTotpSecret(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  const key = Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.alloc(0), Buffer.from("totp-key"), 32));
  const [ivB, ctB, tagB] = payload.split(".");
  if (!ivB || !ctB || !tagB) throw new Error("invalid encrypted payload");
  const iv = Buffer.from(ivB, "base64url");
  const ct = Buffer.from(ctB, "base64url");
  const tag = Buffer.from(tagB, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

test.beforeAll(() => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-32-chars-minimum-padding-1234";
});

test("supplier can log in and view RFQ inbox", async ({ page }) => {
  const user = await db.user.findUnique({ where: { email: "test-integration@officekit.test" } });
  if (!user || !user.twoFaSecret) test.skip();
  if (!user || !user.twoFaSecret) return;

  const plaintextSecret = decryptTotpSecret(user.twoFaSecret);
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(plaintextSecret) });
  const code = totp.generate();

  await page.goto("/sv/supplier/login");
  await page.getByLabel(/e-post/i).fill("test-integration@officekit.test");
  await page.getByLabel(/lösenord/i).fill("integration-test-pw");
  await page.getByLabel(/autentiseringskod/i).fill(code);
  await page.getByRole("button", { name: /logga in/i }).click();

  // Expect navigation to /sv/supplier
  await expect(page).toHaveURL(/\/sv\/supplier(\?|$|\/.*)/);
});
