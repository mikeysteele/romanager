import { test, expect } from "@playwright/test";

test.describe("Platforms & Firmware Flow", () => {
  test("lists platforms and displays 0 ROMs badge when empty", async ({ page }) => {
    const mockPlatforms = [
      {
        id: "plat-snes",
        name: "Super Nintendo",
        slug: "snes",
        path: "snes",
        romCount: 0,
        firmware: [],
      },
      {
        id: "plat-psx",
        name: "Sony PlayStation",
        slug: "psx",
        path: "psx",
        romCount: 15,
        firmware: [
          {
            id: "fw-1",
            filename: "scph1001.bin",
            path: "/bios/scph1001.bin",
            systemId: "plat-psx",
          },
        ],
      },
    ];

    await page.route("**/api/platforms*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPlatforms),
      });
    });

    await page.route("**/api/unmapped*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/settings/platforms");

    // Check page header
    await expect(page.getByRole("heading", { name: "Platforms & Firmware" })).toBeVisible();

    // Both platforms should be rendered
    await expect(page.locator(".platform-title:has-text('Super Nintendo')")).toBeVisible();
    await expect(page.locator(".platform-title:has-text('Sony PlayStation')")).toBeVisible();

    // 0 ROMs platform allows removal
    const snesCard = page.locator(".platform-card:has-text('Super Nintendo')");
    await expect(snesCard.locator("ui-badge:has-text('0 ROMs')")).toBeVisible();
    await expect(snesCard.locator("ui-button:has-text('Remove Platform')")).toBeVisible();

    // Platform with active ROMs shows locked ROM count and no delete button
    const psxCard = page.locator(".platform-card:has-text('Sony PlayStation')");
    await expect(psxCard.locator("ui-badge:has-text('15 ROMs')")).toBeVisible();
    await expect(psxCard.locator("ui-button:has-text('Remove Platform')")).not.toBeVisible();

    // Firmware item displayed on PlayStation
    await expect(psxCard.locator(".firmware-item:has-text('scph1001.bin')")).toBeVisible();
  });

  test("adds a new platform via dialog", async ({ page }) => {
    let platformList = [
      {
        id: "plat-snes",
        name: "Super Nintendo",
        slug: "snes",
        path: "snes",
        romCount: 5,
        firmware: [],
      },
    ];

    await page.route("**/api/platforms*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(platformList),
        });
      } else if (route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() || "{}");
        const newPlat = {
          id: payload.id || "plat-gba",
          name: payload.name,
          slug: payload.slug,
          path: payload.path,
          romCount: 0,
          firmware: [],
        };
        if (!platformList.some((p) => p.name === payload.name)) {
          platformList = [...platformList, newPlat];
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newPlat),
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

    await page.goto("/settings/platforms");

    // Open Add Platform dialog
    await page.locator("ui-page-header ui-button:has-text('Add Platform')").click();

    // Fill inputs
    const nameInput = page.locator("input[placeholder='e.g. PlayStation 2']");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Game Boy Advance");
    await nameInput.dispatchEvent("input");

    const pathInput = page.locator("input[placeholder='e.g. ps2']");
    await pathInput.fill("gba");
    await pathInput.dispatchEvent("input");

    // Submit form
    await page.locator("ui-button[form='add-platform-form']").click();

    // New platform card should appear with 0 ROMs badge
    const gbaCard = page.locator(".platform-card:has-text('Game Boy Advance')");
    await expect(gbaCard).toBeVisible();
    await expect(gbaCard.locator("ui-badge:has-text('0 ROMs')")).toBeVisible();
    await expect(gbaCard.locator("ui-button:has-text('Remove Platform')")).toBeVisible();
  });

  test("removes platform with 0 ROMs", async ({ page }) => {
    let platformList = [
      {
        id: "plat-empty",
        name: "Neo Geo Pocket",
        slug: "ngp",
        path: "ngp",
        romCount: 0,
        firmware: [],
      },
    ];

    await page.route("**/api/platforms*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(platformList),
        });
      }
    });

    await page.route("**/api/platforms/plat-empty", async (route) => {
      if (route.request().method() === "DELETE") {
        platformList = [];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "System plat-empty deleted successfully." }),
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

    // Accept window confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/settings/platforms");

    const ngpCard = page.locator(".platform-card:has-text('Neo Geo Pocket')");
    await expect(ngpCard).toBeVisible();

    // Click Remove Platform
    await ngpCard.locator("ui-button:has-text('Remove Platform')").click();

    // Card should disappear
    await expect(page.locator(".platform-card:has-text('Neo Geo Pocket')")).not.toBeVisible();
  });
});
