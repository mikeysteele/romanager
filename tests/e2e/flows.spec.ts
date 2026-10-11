import { test, expect } from "@playwright/test";

test("Navigation: Sidebar links work", async ({ page }) => {
  await page.goto("/");
  
  // Click Add New
  const sidebar = page.locator("app-sidebar");
  await sidebar.waitFor();
  await sidebar.getByRole("link", { name: "Add New" }).click();
  await expect(page).toHaveURL(/\/add/);
  
  // Click Unmapped
  await sidebar.getByRole("link", { name: "Unmapped" }).click();
  await expect(page).toHaveURL(/\/unmapped/);
});

test("Add Game Flow: Search and Add", async ({ page }) => {
  // Mock API responses
  await page.route("**/api/metadata/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "test-game-123",
        name: "Test Game",
        slug: "test-game",
        rating: 90,
      }])
    });
  });

  await page.route("**/api/games/add", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", id: "test-game-123" })
    });
  });

  await page.goto("/add");

  // Type in search using ui-search-input
  const searchInput = page.locator("ui-search-input input");
  await searchInput.waitFor();
  await searchInput.fill("Test Game");
  await searchInput.press("Enter");

  // Wait for results
  await expect(page.locator("game-card")).toBeVisible();

  // Click result to open modal
  await page.locator("game-card").click();

  // Click Add Game button in dialog
  const addBtn = page.locator("ui-dialog ui-button:has-text('Add Game')");
  await addBtn.waitFor();
  await addBtn.click();

  // Verify success state
  await expect(page.locator("text=Game Added Successfully")).toBeVisible();
});

test("Unmapped Flow: List unmapped files", async ({ page }) => {
  // Mock Unmapped Files
  await page.route("**/api/unmapped*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "scan-1",
        filename: "rom.iso",
        path: "/roms/psx/rom.iso",
        size: 10485760
      }])
    });
  });

  await page.goto("/unmapped");

  // Verify file list shows unmapped file
  await expect(page.getByRole('cell', { name: 'rom.iso', exact: true })).toBeVisible();
});
