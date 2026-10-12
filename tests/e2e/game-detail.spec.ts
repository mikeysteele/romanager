import { test, expect } from "@playwright/test";

test.describe("Game Detail and Emulator Flow", () => {
  const mockGame = {
    id: "game-smw",
    name: "Super Mario World",
    slug: "super-mario-world",
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
            filename: "Super Mario World (USA).sfc",
            path: "/roms/snes/Super Mario World (USA).sfc",
            size: 524288,
            region: "USA",
            crc32: "B19ED489",
            md5: "cdd3c8c37322978ca8669b34bc89c804",
          },
        ],
      },
    ],
  };

  test("displays game metadata, platforms, and ROM table", async ({ page }) => {
    await page.route("**/api/games?slug=super-mario-world*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockGame]),
      });
    });

    await page.goto("/game/super-mario-world");

    // Game title
    await expect(page.locator("h1:has-text('Super Mario World')")).toBeVisible();

    // Release year
    await expect(page.locator(".title-year")).toHaveText("(1990)");

    // Rating badge
    await expect(page.locator(".rating-badge")).toHaveText("94");

    // Platform panel
    await expect(page.locator("ui-tab-panel[name='Super Nintendo']")).toBeAttached();

    // ROM row in table
    const row = page.locator("tr:has-text('Super Mario World (USA).sfc')");
    await expect(row).toBeVisible();
    await expect(row.locator(".region-col")).toHaveText("USA");
    await expect(row.locator("ui-button:has-text('Play / Open')")).toBeVisible();
  });

  test("clicking Play routes to /play/:gameId and displays emulator player", async ({ page }) => {
    await page.route("**/api/games?slug=super-mario-world*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockGame]),
      });
    });

    await page.route("**/api/roms/rom-smw-usa*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "rom-smw-usa",
          filename: "Super Mario World (USA).sfc",
          platform: "snes",
          path: "/roms/snes/Super Mario World (USA).sfc",
        }),
      });
    });

    await page.goto("/game/super-mario-world");

    // Click Play / Open
    const playBtn = page.locator("ui-button:has-text('Play / Open')");
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // URL should transition to emulator
    await expect(page).toHaveURL(/\/play\/rom-smw-usa/);

    // Emulator UI should render
    const emulator = page.locator("app-emulator");
    await expect(emulator).toBeVisible();
    await expect(page.locator(".rom-title:has-text('Super Mario World (USA).sfc')")).toBeVisible();
  });
});
