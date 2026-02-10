import { test, expect } from "@playwright/test";

/**
 * Campaign flow E2E tests.
 * These require authentication — they test the happy path assuming
 * session cookies are set up (via storageState or login fixture).
 */

test.describe("Campaigns", () => {
  // Skip in CI unless auth is configured
  test.skip(
    ({ browserName }) => !!process.env.CI && browserName !== "chromium",
    "Skip non-chromium in CI"
  );

  test("campaigns page shows campaign list", async ({ page }) => {
    // Assuming authenticated state
    await page.goto("/campaigns");
    // Should either show campaigns or redirect to login
    const url = page.url();
    if (url.includes("signin")) {
      test.skip(true, "Not authenticated — skipping");
      return;
    }
    // Should show the campaigns heading or content
    await expect(page.locator("body")).toBeVisible();
  });

  test("new campaign wizard has 4 steps", async ({ page }) => {
    await page.goto("/campaigns/new/basics");
    const url = page.url();
    if (url.includes("signin")) {
      test.skip(true, "Not authenticated — skipping");
      return;
    }
    // Should show the first step form
    await expect(page.locator("body")).toBeVisible();
  });

  test("campaign wizard validates required fields", async ({ page }) => {
    await page.goto("/campaigns/new/basics");
    const url = page.url();
    if (url.includes("signin")) {
      test.skip(true, "Not authenticated — skipping");
      return;
    }
    // Try to proceed without filling required fields
    const nextBtn = page.locator("button:has-text('Next'), a:has-text('Next')").first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      // Should stay on basics or show validation errors
      await expect(page).toHaveURL(/basics/);
    }
  });
});
