import { test, expect } from "@playwright/test";

test("buyer can go from landing through floor plan to request page", async ({ page }) => {
  // --- Landing page ---
  await page.goto("/sv");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // CTA text is "Starta ditt kontor →" (sv translation of common.cta.start)
  await page.getByRole("link", { name: /starta ditt kontor/i }).click();

  // --- Start / industry-picker page ---
  await expect(page).toHaveURL(/\/sv\/start/);
  // IndustryCard renders an <a> wrapping <h3>Law Firms</h3> plus other text.
  // The accessible name is computed from all inner text, so getByRole("link") may
  // not narrow to just "Law Firms". Use the data attribute as a stable selector.
  await page.locator('[data-industry="law"]').click();

  // --- New-project form ---
  await expect(page).toHaveURL(/\/sv\/projects\/new/);
  // "Company name" is hardcoded English in the Field label
  await page.getByLabel(/company name/i).fill("Acme Advokatbyrå");
  // Headcount label is the Swedish translation: "Antal anställda"
  await page.getByLabel(/antal anställda/i).fill("12");
  // City is a <select> with label "Stad" (Swedish for city)
  await page.getByLabel(/stad/i).selectOption("Stockholm");
  // Continue button: "Fortsätt →" (common.cta.continue)
  await page.getByRole("button", { name: /fortsätt/i }).click();

  // --- Checklist page ---
  await expect(page).toHaveURL(/\/checklist$/);
  // SummarySidebar shows "Total uppskattning" (checklist.summary.total)
  await expect(page.getByText(/total uppskattning/i)).toBeVisible();
  // The continue link text is "Fortsätt →" — it goes to /floorplan
  await page.getByRole("link", { name: /fortsätt/i }).click();

  // --- Floor plan page ---
  await expect(page).toHaveURL(/\/floorplan$/);
  // The "Request 3 quotes" link text is hardcoded English in FloorPlanView
  await page.getByRole("link", { name: /request 3 quotes/i }).click();

  // --- Request page ---
  await expect(page).toHaveURL(/\/request$/);
  // h1 uses t("request.title") = "Begär 3 offerter"
  await expect(page.getByRole("heading", { name: /begär 3 offerter/i })).toBeVisible();
});
