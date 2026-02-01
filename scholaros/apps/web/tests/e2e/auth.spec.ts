import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("login page shows the Welcome back heading", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
  });

  test("login page shows sign up link", async ({ page }) => {
    await page.goto("/login");

    const signUpLink = page.getByRole("link", { name: /create one now/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/signup");
  });

  test("login page shows Google OAuth button", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: /continue with google/i })
    ).toBeVisible();
  });

  test("submitting invalid credentials shows an error", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill("invalid@example.com");
    await page.locator('input[name="password"]').fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for the error message to appear (Supabase returns an error)
    const errorContainer = page.locator('[class*="destructive"]');
    await expect(errorContainer.first()).toBeVisible({ timeout: 10_000 });
  });

  test("accessing a protected route without auth redirects to login", async ({
    page,
  }) => {
    await page.goto("/today");

    // The middleware should redirect unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup page loads and shows the create account form", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
  });
});
