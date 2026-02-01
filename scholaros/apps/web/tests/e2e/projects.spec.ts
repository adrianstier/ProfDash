import { test, expect } from "@playwright/test";

test.describe("Projects (unauthenticated)", () => {
  test("projects page redirects to login", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
  });

  test("publications page redirects to login", async ({ page }) => {
    await page.goto("/publications");
    await expect(page).toHaveURL(/\/login/);
  });

  test("grants page redirects to login", async ({ page }) => {
    await page.goto("/grants");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page is functional after project redirect", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);

    // The login page should be fully functional
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i })
    ).toBeVisible();
  });
});
