import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Then("I should see the settings hub cards", async ({ page }) => {
  await expect(page.locator(".card h2:has-text('ROM Management')")).toBeVisible();
  await expect(page.locator(".card h2:has-text('Platforms & Firmware')")).toBeVisible();
  await expect(page.locator(".card h2:has-text('File Types Whitelist')")).toBeVisible();
  await expect(page.locator(".card h2:has-text('Devices & Sync')")).toBeVisible();
});

When("I click the {string} card", async ({ page }, cardName: string) => {
  await page.locator(`.card:has-text('${cardName}')`).click();
});

Given("the current ROMs directory is {string}", async ({ page }, currentPath: string) => {
  let saved = currentPath;
  await page.route("**/api/settings*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ key: "roms_dir", value: saved }]),
      });
    } else if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() || "{}");
      saved = payload.value;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
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

When("I enter {string} as the ROMs directory", async ({ page }, dirPath: string) => {
  const input = page.locator("input#roms-dir");
  await expect(input).toBeVisible();
  await input.fill(dirPath);
});

Then("the ROMs directory input should have value {string}", async ({ page }, expectedValue: string) => {
  const input = page.locator("input#roms-dir");
  await expect(input).toHaveValue(expectedValue);
});

Given("the whitelist includes extensions {string} and {string}", async ({ page }, ext1: string, ext2: string) => {
  const clean1 = ext1.replace(/^\./, "");
  const clean2 = ext2.replace(/^\./, "");

  const mockTypes = [
    {
      id: "ft-1",
      extension: clean1,
      magicNumber: null,
      description: "Sample ROM type 1",
      enabled: true,
    },
    {
      id: "ft-2",
      extension: clean2,
      magicNumber: "4E 45 53 1A",
      description: "Sample ROM type 2",
      enabled: true,
    },
  ];

  await page.route("**/api/file-types*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockTypes),
    });
  });
});

Then("I should see {string} in the file types list", async ({ page }, extText: string) => {
  await expect(page.locator(`.file-type-card:has-text('${extText}')`)).toBeVisible();
});
