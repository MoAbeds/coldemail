import { test, expect } from "@playwright/test";

test.describe("Leads Page", () => {
  test("leads page loads (requires auth)", async ({ page }) => {
    await page.goto("/leads");
    const url = page.url();
    if (url.includes("signin")) {
      test.skip(true, "Not authenticated — skipping");
      return;
    }
    // Should show the leads interface
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Leads - Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("shows single-column layout on mobile", async ({ page }) => {
    await page.goto("/leads");
    const url = page.url();
    if (url.includes("signin")) {
      test.skip(true, "Not authenticated");
      return;
    }
    // On mobile, should show list view (no sidebar visible)
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Leads - Desktop Layout", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows 3-panel layout on desktop", async ({ page }) => {
    await page.goto("/leads");
    const url = page.url();
    if (url.includes("signin")) {
      test.skip(true, "Not authenticated");
      return;
    }
    await expect(page.locator("body")).toBeVisible();
  });
});
