import { expect } from "@playwright/test";
import { createBdd, DataTable } from "playwright-bdd";

const { Given, When, Then } = createBdd();

let mockPlatformsList: Array<{
  id: string;
  name: string;
  slug: string;
  path: string;
  romCount: number;
  firmware: unknown[];
}> = [];

Given("the following platforms exist:", async ({ page }, dataTable: DataTable) => {
  const rows = dataTable.hashes();
  mockPlatformsList = rows.map((r, i) => ({
    id: `plat-${r.slug || i}`,
    name: r.name,
    slug: r.slug,
    path: r.slug,
    romCount: Number(r.romCount || 0),
    firmware: [],
  }));

  await page.route("**/api/platforms*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPlatformsList),
      });
    } else if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() || "{}");
      const newPlat = {
        id: payload.id || "plat-new",
        name: payload.name,
        slug: payload.slug,
        path: payload.path,
        romCount: 0,
        firmware: [],
      };
      if (!mockPlatformsList.some((p) => p.name === payload.name)) {
        mockPlatformsList = [...mockPlatformsList, newPlat];
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(newPlat),
      });
    }
  });

  await page.route("**/api/platforms/*", async (route) => {
    if (route.request().method() === "DELETE") {
      const url = route.request().url();
      const id = url.split("/").pop();
      mockPlatformsList = mockPlatformsList.filter((p) => p.id !== id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: `System ${id} deleted successfully.` }),
      });
    }
  });

  await page.route("**/api/unmapped*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
});

Then("I should see {string} in the platforms list", async ({ page }, name: string) => {
  await expect(page.locator(`.platform-title:has-text('${name}')`)).toBeVisible();
});

Then("the {string} platform should have a {string} badge", async ({ page }, name: string, badgeText: string) => {
  const card = page.locator(`.platform-card:has-text('${name}')`);
  await expect(card.locator(`ui-badge:has-text('${badgeText}')`)).toBeVisible();
});

Then("the {string} platform should have a {string} button", async ({ page }, name: string, btnText: string) => {
  const card = page.locator(`.platform-card:has-text('${name}')`);
  await expect(card.locator(`ui-button:has-text('${btnText}')`)).toBeVisible();
});

Then("the {string} platform should not have a {string} button", async ({ page }, name: string, btnText: string) => {
  const card = page.locator(`.platform-card:has-text('${name}')`);
  await expect(card.locator(`ui-button:has-text('${btnText}')`)).not.toBeVisible();
});

When("I click the {string} button in the page header", async ({ page }, btnText: string) => {
  await page.locator(`ui-page-header ui-button:has-text('${btnText}')`).click();
});

When("I enter {string} as the new platform name", async ({ page }, name: string) => {
  const nameInput = page.locator("input[placeholder='e.g. PlayStation 2']");
  await expect(nameInput).toBeVisible();
  await nameInput.fill(name);
  await nameInput.dispatchEvent("input");
});

When("I enter {string} as the new platform core path", async ({ page }, pathVal: string) => {
  const pathInput = page.locator("input[placeholder='e.g. ps2']");
  await pathInput.fill(pathVal);
  await pathInput.dispatchEvent("input");
});

When("I submit the add platform form", async ({ page }) => {
  await page.locator("ui-button[form='add-platform-form']").click();
});

When("I click {string} on the {string} platform", async ({ page }, btnText: string, platformName: string) => {
  page.on("dialog", (dialog) => dialog.accept());
  const card = page.locator(`.platform-card:has-text('${platformName}')`);
  await card.locator(`ui-button:has-text('${btnText}')`).click();
});

Then("{string} should not be in the platforms list", async ({ page }, platformName: string) => {
  await expect(page.locator(`.platform-card:has-text('${platformName}')`)).not.toBeVisible();
});
