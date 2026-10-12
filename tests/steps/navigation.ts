import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

When("I navigate to the {string} page", async ({ page }, pathUrl: string) => {
  await page.goto(pathUrl);
});

Then("the page title should contain {string}", async ({ page }, expectedTitle: string) => {
  await expect(page).toHaveTitle(new RegExp(expectedTitle));
});

Then("the ROM library should be displayed", async ({ page }) => {
  await expect(page.locator("app-library").first()).toBeVisible();
});

Then("I should see the sidebar", async ({ page }) => {
  await expect(page.locator("app-sidebar")).toBeVisible();
});

When("I click the {string} link in the sidebar", async ({ page }, linkText: string) => {
  const sidebar = page.locator("app-sidebar");
  await sidebar.getByRole("link", { name: linkText }).click();
});

Then("I should be on the {string} page", async ({ page }, pathUrl: string) => {
  const escaped = pathUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(page).toHaveURL(new RegExp(escaped));
});

Given("the metadata search returns a game {string} with slug {string}", async ({ page }, name: string, slug: string) => {
  await page.route("**/api/metadata/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "test-game-123",
          name,
          slug,
          rating: 90,
        },
      ]),
    });
  });

  await page.route("**/api/games/add", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", id: "test-game-123" }),
    });
  });
});

When("I search for {string} in the add game search bar", async ({ page }, query: string) => {
  const searchInput = page.locator("ui-search-input input");
  await searchInput.waitFor();
  await searchInput.fill(query);
  await searchInput.press("Enter");
});

Then("I should see the game card for {string}", async ({ page }, _name: string) => {
  await expect(page.locator("game-card")).toBeVisible();
});

When("I click on the game card for {string}", async ({ page }, _name: string) => {
  await page.locator("game-card").click();
});

When("I click {string} in the dialog", async ({ page }, btnText: string) => {
  const btn = page.locator(`ui-dialog ui-button:has-text('${btnText}')`);
  await btn.waitFor();
  await btn.click();
});

Then("I should see {string}", async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`).first()).toBeVisible();
});

Given("there is an unmapped file {string} of size {int}", async ({ page }, filename: string, size: number) => {
  await page.route("**/api/unmapped*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "scan-1",
          filename,
          path: `/roms/psx/${filename}`,
          size,
        },
      ]),
    });
  });
});

Then("I should see {string} in the unmapped files table", async ({ page }, filename: string) => {
  await expect(page.getByRole("cell", { name: filename, exact: true })).toBeVisible();
});
