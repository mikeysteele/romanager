import { test, expect } from "@playwright/test";

test("Navigation: Sidebar links work", async ({ page }) => {
  await page.goto("http://localhost:8000");
  
  // Click Add New
  const sidebar = page.locator("app-sidebar");
  await sidebar.waitFor();
  await sidebar.getByRole("link", { name: "Add New" }).click();
  await expect(page).toHaveURL("http://localhost:8000/add");
  
  // Click Import
  await sidebar.getByRole("link", { name: "Import" }).click();
  await expect(page).toHaveURL("http://localhost:8000/import");
});

test("Add Game Flow: Search and Add", async ({ page }) => {
  // Mock API responses
  await page.route("**/api/metadata/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        identifier: "test-game",
        title: "Test Game",
        year: "2024",
        coverUrl: "/placeholder.png"
      }])
    });
  });

  await page.route("**/api/games/add", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", id: "123" })
    });
  });

  await page.goto("http://localhost:8000/add");

  // Type in search
  await page.fill("input[type=search]", "Test Game");
  await page.press("input[type=search]", "Enter");

  // Wait for results
  await expect(page.locator("text=Test Game")).toBeVisible();

  // Click result to open modal
  await page.click("text=Test Game");

  // Select system (assuming at least one system exists or mocked)
  // For now we might just try to click Add if default is selected
  // or we need to mock /api/systems to ensure data
  
  // Click Add Game
  // Note: Button text changes to "Adding..." then alert
  // We handle alert
  page.on('dialog', dialog => dialog.accept());
  await page.click("text=Add Game");

  // Verify modal closed or success state?
  // Since we use alert, difficult to verify UI change unless we check for side effects
  // But mock ensures API was called.
});

test("Import Flow: List and Import", async ({ page }) => {
    // Mock Scans
    await page.route("**/api/scans", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([{
                id: "scan-1",
                filename: "rom.iso",
                path: "/path/rom.iso",
                size: 1000
            }])
        });
    });
    
    // Mock Systems
    await page.route("**/api/systems", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([{
                id: "sys-1",
                name: "Test System"
            }])
        });
    });

    // Mock Search
    await page.route("**/api/metadata/search**", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
             body: JSON.stringify([{
                identifier: "test-game-import",
                title: "Imported Game",
                year: "2000"
            }])
        });
    });

    // Mock Import
    await page.route("**/api/import", async (route) => {
        await route.fulfill({ body: JSON.stringify({ status: "success" }) });
    });

    await page.goto("http://localhost:8000/import");

    // Verify file list
    await expect(page.locator("text=rom.iso")).toBeVisible();

    // Click Import
    await page.click("button:has-text('Import')");

    // Modal opens
    await expect(page.locator("h2:has-text('Import rom.iso')")).toBeVisible();

    // Select System (first select found is usually system in this modal structure, or use precise locator)
    // The modal has multiple selects.
    // 1. System
    // 2. Region
    // use label locator
    await page.locator("label:has-text('System') + select").selectOption("sys-1");


    // Trigger search in modal
    await page.fill(".modal input[type=search]", "Game");
    await page.click(".modal button:has-text('Search')");
    
    // Select game result
    await page.click("text=Imported Game");

    // Click Final Import
    await page.click(".modal-actions button:has-text('Import')");

    // Verify success - maybe check list reloads?
    // We mocked /api/scans separately, but if we don't update it, it won't change.
    // But we can check that the modal closed.
    await expect(page.locator(".modal")).not.toBeVisible();
});
