import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("signin page loads", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page).toHaveURL(/signin/);
    await expect(page.locator("input[name='email'], input[type='email']")).toBeVisible();
    await expect(page.locator("input[name='password'], input[type='password']")).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page).toHaveURL(/signup/);
    await expect(page.locator("input[name='name'], input[type='text']").first()).toBeVisible();
    await expect(page.locator("input[name='email'], input[type='email']")).toBeVisible();
  });

  test("shows validation errors on empty login", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.click("button[type='submit']");
    // Should show some error state (form won't navigate away)
    await expect(page).toHaveURL(/signin/);
  });

  test("shows validation errors on invalid signup", async ({ page }) => {
    await page.goto("/auth/signup");
    // Fill only name, missing other fields
    const nameInput = page.locator("input[name='name'], input[type='text']").first();
    await nameInput.fill("Test User");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/signup/);
  });

  test("signup form validates password requirements", async ({ page }) => {
    await page.goto("/auth/signup");
    const nameInput = page.locator("input[name='name'], input[type='text']").first();
    await nameInput.fill("Test User");
    await page.locator("input[name='email'], input[type='email']").fill("test@example.com");
    await page.locator("input[name='password'], input[type='password']").first().fill("weak");
    await page.click("button[type='submit']");
    // Should stay on signup page due to validation
    await expect(page).toHaveURL(/signup/);
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.locator("input[name='email'], input[type='email']")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to signin
    await expect(page).toHaveURL(/signin/);
  });
});
