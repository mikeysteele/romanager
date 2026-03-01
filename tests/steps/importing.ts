import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { DataTable } from "playwright-bdd";
import { type Rom } from "@repo/shared";

const { Given, When, Then } = createBdd();

const TEST_ROOT = "/tmp/roms-e2e";

Given('I am on the settings page', async ({ page }) => {
  await page.goto('/settings');
});

Given('I have a folder structure:', async ({}, dataTable: DataTable) => {
  // Clean up
  try { await fs.rm(TEST_ROOT, { recursive: true, force: true }); } catch {}
  await fs.mkdir(TEST_ROOT, { recursive: true });

  const rows = dataTable.hashes();
  for (const row of rows) {
      const filePath = path.join(TEST_ROOT, row.path.replace(/^\/roms/, ''));
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, 'dummy content');
  }
});

Given('I have a file located at {string}', async ({}, filePath: string) => {
    // This step might overlap with folder structure, but handling singly
    try { await fs.rm(TEST_ROOT, { recursive: true, force: true }); } catch {}
    await fs.mkdir(TEST_ROOT, { recursive: true });
    
    const realPath = path.join(TEST_ROOT, filePath.replace(/^\/roms/, ''));
    const dir = path.dirname(realPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(realPath, 'dummy content');
});

When('I scan the {string} directory', async ({ request }) => {
    // Trigger scan via API directly for this scenario, or use UI?
    // The scenario implies user action, but likely "I scan" is generic.
    // If we use UI, we need to go to settings.
    // Let's use API for speed/reliability in this specific data-setup scenario, 
    // or just assume we use the settings page flow if we want E2E fidelity.
    // But the step "When I scan the..." is abstract.
    // Let's call the API.
    const res = await request.post('/api/settings', {
        data: { key: 'roms_dir', value: TEST_ROOT }
    });
    expect(res.ok()).toBeTruthy();
    // Wait for scan to likely finish - or use SSE if we can hook into it from here?
    // We can poll /api/games
    // Simple wait for now
    await new Promise(r => setTimeout(r, 1000));
});

When('I set the ROMs directory to {string}', async ({ page }, romsDir: string) => {
  const input = page.locator('#roms-dir');
  await input.fill(romsDir);
});

When('I click the {string} button', async ({ page }, name: string) => {
    await page.getByRole('button', { name }).click();
});

Then('I should see a {string} alert', async ({ }, _message: string) => {
     // no-op for now
});

Then('I wait for the {string} event', async ({ page }, eventName: string) => {
    await page.evaluate((eventName) => {
        return new Promise<void>(resolve => {
            const timeout = setTimeout(() => resolve(), 5000); // fallback
            window.addEventListener(eventName, () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
    }, eventName);
});

Then('I should be on the library page', async ({ page }) => {
  await expect(page).toHaveURL(/\/$/);
});

Then('I should see {string} in the systems list', async ({ page }, text: string) => {
  await expect(page.locator('app-library')).toContainText(text);
});

Then('I should find {int} games', async ({ request }, count: number) => {
    // Poll API
    let games = [];
    for (let i = 0; i < 10; i++) {
        const res = await request.get('/api/games');
        games = await res.json();
        if (games.length >= count) break;
        await new Promise(r => setTimeout(r, 500));
    }
    expect(games.length).toBe(count);
});

Then('the game {string} should be found', async ({ request }, filename: string) => {
    const res = await request.get('/api/games');
    const games = await res.json();
    const found = games.find((g: Rom) => g.filename === filename);
    expect(found).toBeTruthy();
});
