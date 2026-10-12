import { test, expect } from "@playwright/test";

test.describe("Settings and Configuration Flow", () => {
  test("settings hub displays navigation cards and links to sub-settings", async ({ page }) => {
    await page.goto("/settings");

    // Header
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Cards should all be present
    await expect(page.locator(".card h2:has-text('ROM Management')")).toBeVisible();
    await expect(page.locator(".card h2:has-text('Platforms & Firmware')")).toBeVisible();
    await expect(page.locator(".card h2:has-text('File Types Whitelist')")).toBeVisible();
    await expect(page.locator(".card h2:has-text('Devices & Sync')")).toBeVisible();

    // Click ROM Management card
    await page.locator(".card:has-text('ROM Management')").click();
    await expect(page).toHaveURL(/\/settings\/rom-management/);
    await expect(page.getByRole("heading", { name: "ROM Management" })).toBeVisible();
  });

  test("ROM Management loads current settings, allows editing path, and saving", async ({ page }) => {
    let savedPath = "/mnt/emulation/roms";

    await page.route("**/api/settings*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ key: "roms_dir", value: savedPath }]),
        });
      } else if (route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() || "{}");
        savedPath = payload.value;
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

    await page.goto("/settings/rom-management");

    // Input should be loaded with current setting
    const input = page.locator("input#roms-dir");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("/mnt/emulation/roms");

    // Edit path
    await input.fill("/mnt/retro/roms");

    // Submit form
    await page.locator("ui-button[type='submit']:has-text('Save & Scan')").click();

    // Value persists in input
    await expect(input).toHaveValue("/mnt/retro/roms");
  });

  test("File Types Whitelist displays extensions and signatures", async ({ page }) => {
    const mockTypes = [
      {
        id: "ft-sfc",
        extension: "sfc",
        magicNumber: null,
        description: "Super Nintendo ROM",
        enabled: true,
      },
      {
        id: "ft-nes",
        extension: "nes",
        magicNumber: "4E 45 53 1A",
        description: "iNES Header",
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

    await page.goto("/settings/file-types");

    await expect(page.getByRole("heading", { name: "ROM & BIOS File Types" })).toBeVisible();

    // Verify .sfc card
    const sfcCard = page.locator(".file-type-card:has-text('.sfc')");
    await expect(sfcCard).toBeVisible();
    await expect(sfcCard.locator(".description")).toHaveText("Super Nintendo ROM");

    // Verify .nes card with magic number
    const nesCard = page.locator(".file-type-card:has-text('.nes')");
    await expect(nesCard).toBeVisible();
    await expect(nesCard.locator(".magic-badge")).toContainText("4E 45 53 1A");
  });
});
