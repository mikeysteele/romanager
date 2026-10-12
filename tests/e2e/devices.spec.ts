import { test, expect } from "@playwright/test";

test.describe("Companion Devices Flow", () => {
  test("displays empty state when no devices enrolled and opens Add Device modal", async ({ page }) => {
    await page.route("**/api/devices", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings/devices");

    // Empty state message should be visible
    await expect(page.locator("text=No Devices Enrolled")).toBeVisible();
    await expect(page.locator("text=Enroll a handheld or console")).toBeVisible();

    // Click Add Device button
    const addBtn = page.locator("ui-button:has-text('+ Add Device')");
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Add device dialog should open
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("h2")).toHaveText("Add New Companion Device");

    // Check fields
    await expect(dialog.locator("input[placeholder='e.g. Living Room Batocera']")).toBeVisible();
    await expect(dialog.locator("select")).toBeVisible();
  });

  test("enrolls a new device and displays enrollment key modal", async ({ page }) => {
    let devicesList: unknown[] = [];

    await page.route("**/api/devices", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(devicesList),
        });
      } else if (route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() || "{}");
        const newDev = {
          id: "dev-batocera-1",
          name: payload.name,
          preset: payload.preset,
          storageBudgetBytes: payload.storageBudgetBytes,
          lastSeenAt: null,
          lastSyncAt: null,
          agentVersion: null,
          profile: payload.profile,
        };
        devicesList = [newDev];
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            device: newDev,
            apiKey: { rawKey: "rmg_test_token_123456789" },
          }),
        });
      }
    });

    await page.goto("/settings/devices");

    // Open add device modal
    await page.locator("ui-button:has-text('+ Add Device')").click();

    const dialog = page.locator("dialog[open]");
    await dialog.locator("input[type='text']").fill("Living Room Batocera");
    await dialog.locator("select").selectOption("batocera");
    await dialog.locator("input[type='number']").fill("64");

    // Submit form
    await dialog.locator("ui-button[type='submit']").click();

    // Enrollment dialog should appear
    const enrollModal = page.locator("dialog[open]:has-text('Device Enrolled: Living Room Batocera')");
    await expect(enrollModal).toBeVisible();
    await expect(enrollModal.locator(".code-box")).toContainText("romanager-sync init");
    await expect(enrollModal.locator(".code-box")).toContainText("rmg_test_token_123456789");

    // Close enrollment modal
    await enrollModal.locator("ui-button:has-text('Done')").click();

    // Card should now be visible on page
    const card = page.locator(".device-card");
    await expect(card).toBeVisible();
    await expect(card.locator(".device-name")).toHaveText("Living Room Batocera");
    await expect(card.locator(".badge-batocera")).toHaveText("batocera");
  });

  test("opens edit profile modal, modifies rules, and saves", async ({ page }) => {
    const mockDevice = {
      id: "dev-rg35xx",
      name: "Anbernic RG35XX",
      preset: "esde",
      storageBudgetBytes: 34359738368,
      lastSeenAt: "2026-10-10T12:00:00Z",
      lastSyncAt: "2026-10-10T12:15:00Z",
      agentVersion: "1.2.0",
      profile: {
        deviceId: "dev-rg35xx",
        regionPreference: "USA,EUR",
        oneRomPerGame: false,
        includeFirmware: true,
        rules: [],
      },
    };

    await page.route("**/api/devices", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockDevice]),
      });
    });

    await page.route("**/api/devices/dev-rg35xx", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDevice),
        });
      } else if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "success" }),
        });
      }
    });

    await page.goto("/settings/devices");

    // Click Edit Profile button
    const editBtn = page.locator(".device-card ui-button:has-text('Edit Profile')");
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit modal should open
    const editModal = page.locator("dialog[open]:has-text('Edit Profile: Anbernic RG35XX')");
    await expect(editModal).toBeVisible();

    // Verify fields populated
    const regionInput = editModal.locator("input[placeholder='USA,EUR,JPN']");
    await expect(regionInput).toHaveValue("USA,EUR");

    // Add a sync rule
    await editModal.locator("select").selectOption("include_system");
    await editModal.locator("input[placeholder='Target ID']").fill("gba");
    await editModal.locator("ui-button:has-text('+ Add')").click();

    // Rule should be listed
    await expect(editModal.locator(".rules-list .rule-item")).toBeVisible();
    await expect(editModal.locator(".rules-list")).toContainText("include_system");
    await expect(editModal.locator(".rules-list")).toContainText("gba");

    // Save profile
    await editModal.locator("ui-button[type='submit']:has-text('Save Profile')").click();

    // Modal should close
    await expect(editModal).not.toBeVisible();
  });
});
