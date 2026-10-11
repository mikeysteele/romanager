import { test, expect } from "@playwright/test";

test("home page has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Romanager/);
});

test("rom list is displayed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("app-library").first()).toBeVisible();
});
