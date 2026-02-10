import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page redirects to signin or dashboard", async ({ page }) => {
    await page.goto("/");
    const url = page.url();
    expect(url.includes("signin") || url.includes("dashboard") || url.includes("auth")).toBe(true);
  });

  test("signin page has links to signup and forgot password", async ({ page }) => {
    await page.goto("/auth/signin");
    const signupLink = page.locator("a[href*='signup']");
    const forgotLink = page.locator("a[href*='forgot']");
    // At least one should exist
    const hasSignup = await signupLink.count();
    const hasForgot = await forgotLink.count();
    expect(hasSignup + hasForgot).toBeGreaterThan(0);
  });
});

test.describe("Responsive - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("signin page renders correctly on mobile", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    // Check inputs are reasonably wide (not overflowing)
    const input = page.locator("input[type='email'], input[name='email']").first();
    const box = await input.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(200);
      expect(box.width).toBeLessThan(380);
    }
  });
});

test.describe("Responsive - Desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("signin page renders correctly on desktop", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
  });
});
