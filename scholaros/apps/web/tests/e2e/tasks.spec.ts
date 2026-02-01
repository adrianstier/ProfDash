import { test, expect } from "@playwright/test";

test.describe("Task management (unauthenticated)", () => {
  // Without authentication, all task views redirect to login.
  // These tests verify the redirect and that the login page loads properly.

  test("list view redirects to login", async ({ page }) => {
    await page.goto("/list");
    await expect(page).toHaveURL(/\/login/);
  });

  test("board view redirects to login", async ({ page }) => {
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login/);
  });

  test("today view redirects to login", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly after redirect from task view", async ({
    page,
  }) => {
    await page.goto("/list");
    await expect(page).toHaveURL(/\/login/);

    // Verify the login form is usable after redirect
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });
});

test.describe("Task page structure", () => {
  // Verify that the login page we land on after redirect is well-formed,
  // which indirectly tests that the middleware and routing are correct.

  test("login form accepts input after redirect from today view", async ({
    page,
  }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);

    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill("testpassword");
    await expect(passwordInput).toHaveValue("testpassword");
  });
});
