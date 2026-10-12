import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

let mockDevicesList: Array<Record<string, unknown>> = [];

Given("there are no companion devices enrolled", async ({ page }) => {
  mockDevicesList = [];
  await page.route("**/api/devices", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDevicesList),
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
      mockDevicesList = [newDev];
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
});

Then("I should see the {string} button", async ({ page }, btnText: string) => {
  await expect(page.locator(`ui-button:has-text('${btnText}')`)).toBeVisible();
});

Given("an enrolled device {string} with preset {string}", async ({ page }, name: string, preset: string) => {
  const mockDevice = {
    id: "dev-rg35xx",
    name,
    preset,
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

  mockDevicesList = [mockDevice];
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
});

When("I enter {string} as the device name", async ({ page }, name: string) => {
  const dialog = page.locator("dialog[open]");
  await dialog.locator("input[placeholder='e.g. Living Room Batocera']").fill(name);
});

When("I select {string} as the frontend preset", async ({ page }, preset: string) => {
  const dialog = page.locator("dialog[open]");
  await dialog.locator("select").selectOption(preset);
});

When("I enter {string} as the storage budget limit", async ({ page }, budget: string) => {
  const dialog = page.locator("dialog[open]");
  await dialog.locator("input[type='number']").fill(budget);
});

When("I submit the device creation form", async ({ page }) => {
  const dialog = page.locator("dialog[open]");
  await dialog.locator("ui-button[type='submit']").click();
});

Then("I should see the enrollment command containing {string}", async ({ page }, text: string) => {
  const enrollModal = page.locator("dialog[open]");
  await expect(enrollModal).toBeVisible();
  await expect(enrollModal.locator(".code-box")).toContainText(text);
});

When("I close the enrollment dialog", async ({ page }) => {
  const enrollModal = page.locator("dialog[open]");
  await enrollModal.locator("ui-button:has-text('Done')").click();
});

Then("the device {string} should appear in the devices list", async ({ page }, name: string) => {
  const card = page.locator(".device-card");
  await expect(card.locator(".device-name")).toHaveText(name);
});

Then("the device should have the {string} badge", async ({ page }, badge: string) => {
  const card = page.locator(".device-card");
  await expect(card.locator(`.badge-${badge}`)).toHaveText(badge);
});

When("I click {string} on the {string} device", async ({ page }, buttonText: string, deviceName: string) => {
  const card = page.locator(`.device-card:has-text('${deviceName}')`);
  await card.locator(`ui-button:has-text('${buttonText}')`).click();
});

When("I add a sync rule with kind {string} and target {string}", async ({ page }, kind: string, target: string) => {
  const editModal = page.locator("dialog[open]");
  await editModal.locator("select").selectOption(kind);
  await editModal.locator("input[placeholder='Target ID']").fill(target);
  await editModal.locator("ui-button:has-text('+ Add')").click();
});

When("I save the device profile", async ({ page }) => {
  const editModal = page.locator("dialog[open]");
  await editModal.locator("ui-button[type='submit']:has-text('Save Profile')").click();
});

Then("the edit profile dialog should close", async ({ page }) => {
  await expect(page.locator("dialog[open]:has-text('Edit Profile')")).not.toBeVisible();
});
