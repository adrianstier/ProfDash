import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  // All dashboard routes require auth and will redirect to /login.
  // These tests verify the redirect behavior works correctly for each route.

  const protectedRoutes = [
    { path: "/today", label: "Today" },
    { path: "/upcoming", label: "Upcoming" },
    { path: "/board", label: "Board" },
    { path: "/list", label: "List" },
    { path: "/calendar", label: "Calendar" },
    { path: "/projects", label: "Projects" },
    { path: "/grants", label: "Grants" },
    { path: "/settings", label: "Settings" },
  ];

  for (const route of protectedRoutes) {
    test(`${route.label} route (${route.path}) redirects to login when unauthenticated`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("login page has navigation link to signup", async ({ page }) => {
    await page.goto("/login");

    const signupLink = page.getByRole("link", { name: /create one now/i });
    await expect(signupLink).toBeVisible();
  });

  test("signup page has navigation link back to login", async ({ page }) => {
    await page.goto("/signup");

    const loginLink = page.getByRole("link", { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("can navigate from login to signup via link", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /create one now/i }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();
  });

  test("can navigate from signup to login via link", async ({ page }) => {
    await page.goto("/signup");

    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
  });
});
