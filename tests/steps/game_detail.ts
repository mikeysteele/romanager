import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

let mockGameDetail: Record<string, unknown> | null = null;
let mockRomDetail: Record<string, unknown> | null = null;

Given(
  "the game {string} with slug {string} exists with a ROM {string}",
  async ({ page }, gameName: string, gameSlug: string, romFilename: string) => {
    mockGameDetail = {
      id: "game-smw",
      name: gameName,
      slug: gameSlug,
      description: "Classic platforming adventure on Dinosaur Land.",
      released: "1990-11-21",
      rating: 94,
      backgroundImage: "https://example.com/smw.jpg",
      platforms: [
        {
          id: "plat-snes",
          name: "Super Nintendo",
          slug: "snes",
          path: "snes",
          roms: [
            {
              id: "rom-smw-usa",
              systemId: "plat-snes",
              filename: romFilename,
              path: `/roms/snes/${romFilename}`,
              size: 524288,
              region: "USA",
              crc32: "B19ED489",
              md5: "cdd3c8c37322978ca8669b34bc89c804",
            },
          ],
        },
      ],
    };

    mockRomDetail = {
      id: "rom-smw-usa",
      filename: romFilename,
      platform: "snes",
      path: `/roms/snes/${romFilename}`,
    };

    await page.route(`**/api/games?slug=${gameSlug}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockGameDetail]),
      });
    });

    await page.route("**/api/roms/rom-smw-usa*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRomDetail),
      });
    });
  }
);

Then("I should see {string} as the game title", async ({ page }, title: string) => {
  await expect(page.locator(`h1:has-text('${title}')`)).toBeVisible();
});

Then("I should see {string} as the release year", async ({ page }, year: string) => {
  await expect(page.locator(".title-year")).toHaveText(year);
});

Then("I should see {string} as the game rating", async ({ page }, rating: string) => {
  await expect(page.locator(".rating-badge")).toHaveText(rating);
});

Then("I should see the ROM file {string} in the files table", async ({ page }, filename: string) => {
  const row = page.locator(`tr:has-text('${filename}')`);
  await expect(row).toBeVisible();
});

Then("I should see a {string} button for the ROM", async ({ page }, btnText: string) => {
  await expect(page.locator(`ui-button:has-text('${btnText}')`)).toBeVisible();
});

When("I click the {string} button for the ROM", async ({ page }, btnText: string) => {
  await page.locator(`ui-button:has-text('${btnText}')`).click();
});

Then("I should be on the play page for the ROM", async ({ page }) => {
  await expect(page).toHaveURL(/\/play\/rom-smw-usa/);
});

Then("the emulator player should be displayed with {string}", async ({ page }, filename: string) => {
  const emulator = page.locator("app-emulator");
  await expect(emulator).toBeVisible();
  await expect(page.locator(`.rom-title:has-text('${filename}')`)).toBeVisible();
});
