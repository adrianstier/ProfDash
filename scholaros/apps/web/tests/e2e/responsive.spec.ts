import { test, expect } from "@playwright/test";

test.describe("Responsive layout", () => {
  test("mobile viewport renders login page correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    // On mobile, the left branding panel is hidden (lg:flex)
    // The mobile logo should be visible instead
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
  });

  test("desktop viewport renders login page with branding panel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");

    // On desktop, the branding panel with "Your academic command center" is visible
    await expect(page.getByText("Your academic")).toBeVisible();
    await expect(page.getByText("command center.")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("mobile viewport renders signup page correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("desktop viewport renders signup page with branding panel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/signup");

    // Desktop shows the left branding with "Join thousands of scholars"
    await expect(page.getByText("Join thousands")).toBeVisible();
    await expect(page.getByText("of scholars.")).toBeVisible();
  });

  test("tablet viewport renders login page", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/login");

    // On tablet (below lg breakpoint), branding panel is hidden
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
  });
});
