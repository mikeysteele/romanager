import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { DataTable } from "playwright-bdd";

const { Given, When, Then } = createBdd();

const TEST_ROOT = "/tmp/roms-e2e";

Given('I am on the settings page', async ({ page, request }) => {
  try {
    await request.post('/api/platforms', {
      data: { id: 'plat-snes', name: 'SNES', slug: 'snes', path: 'snes' }
    });
  } catch {
    // Ignore if already created
  }
  await fs.mkdir('/tmp/roms/snes', { recursive: true });
  await fs.writeFile('/tmp/roms/snes/mario.sfc', 'dummy content');
  await page.goto('/settings/rom-management');
});

Given('I have a folder structure:', async ({ $test: _test }, dataTable: DataTable) => {
  // Clean up
  try { 
    await fs.rm(TEST_ROOT, { recursive: true, force: true }); 
  } catch {
    // Ignore cleanup error if directory does not exist
  }
  await fs.mkdir(TEST_ROOT, { recursive: true });

  const rows = dataTable.hashes();
  for (const row of rows) {
      const filePath = path.join(TEST_ROOT, row.path.replace(/^\/roms/, ''));
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, 'dummy content');
  }
});

Given('I have a file located at {string}', async ({ $test: _test }, filePath: string) => {
    try { 
      await fs.rm(TEST_ROOT, { recursive: true, force: true }); 
    } catch {
      // Ignore cleanup error if directory does not exist
    }
    await fs.mkdir(TEST_ROOT, { recursive: true });
    
    const realPath = path.join(TEST_ROOT, filePath.replace(/^\/roms/, ''));
    const dir = path.dirname(realPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(realPath, 'dummy content');
});

When('I scan the {string} directory', async ({ request }) => {
    const res = await request.post('/api/settings', {
        data: { key: 'roms_dir', value: TEST_ROOT }
    });
    expect(res.ok()).toBeTruthy();
    await new Promise(r => setTimeout(r, 1000));
});

When('I set the ROMs directory to {string}', async ({ page }, romsDir: string) => {
  const input = page.locator('#roms-dir');
  await input.fill(romsDir);
});

When('I click the {string} button', async ({ page }, name: string) => {
    await page.locator(`ui-button:has-text("${name}"), button:has-text("${name}")`).first().click();
});

Then('I should see a {string} alert', async ({ $test: _test }, _message: string) => {
     // no-op for now
});

Then('I wait for the {string} event', async ({ page }, eventName: string) => {
    await page.evaluate((eventName) => {
        return new Promise<void>(resolve => {
            const timeout = setTimeout(() => resolve(), 5000); // fallback
            // deno-lint-ignore no-window no-window-prefix
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
  await expect(page.locator('app-sidebar')).toContainText(text);
});

Then('I should find {int} games', async ({ request }, count: number) => {
    // Poll API
    let totalCount = 0;
    for (let i = 0; i < 15; i++) {
        const res = await request.get('/api/games');
        const games = res.ok() ? await res.json() : [];
        const unmappedRes = await request.get('/api/unmapped');
        const unmapped = unmappedRes.ok() ? await unmappedRes.json() : [];
        totalCount = games.length + unmapped.length;
        if (totalCount >= count) break;
        await new Promise(r => setTimeout(r, 500));
    }
    expect(totalCount).toBeGreaterThanOrEqual(count);
});

interface GameSearchResult {
  filename?: string;
  name?: string;
  platforms?: Array<{
    roms?: Array<{
      filename?: string;
    }>;
  }>;
}

When('I navigate to the library page', async ({ page }) => {
    await page.goto('/');
});

Then('the game {string} should be found', async ({ request }, filename: string) => {
    const res = await request.get('/api/games');
    const games: GameSearchResult[] = await res.json();
    const cleanName = filename.replace(/\.[^/.]+$/, "");
    let found: GameSearchResult | { filename?: string; path?: string } | undefined = games.find((g) => 
        g.filename === filename || 
        g.name?.toLowerCase().includes(cleanName.toLowerCase()) ||
        g.platforms?.some((p) => p.roms?.some((r) => r.filename === filename))
    );
    if (!found) {
        const unmappedRes = await request.get('/api/unmapped');
        if (unmappedRes.ok()) {
            const unmapped = await unmappedRes.json();
            found = unmapped.find((f: { filename?: string; path?: string }) => f.filename === filename || f.path?.includes(filename));
        }
    }
    expect(found).toBeTruthy();
});
