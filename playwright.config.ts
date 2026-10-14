import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testBddDb = path.resolve(__dirname, "test-bdd.db");

const bddTestDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  webServer: {
    command: `DB_URL=file:${testBddDb} pnpm --filter @romanager/api exec drizzle-kit push --config=drizzle.config.ts && DB_URL=file:${testBddDb} PORT=3333 pnpm --filter @romanager/api start`,
    url: "http://127.0.0.1:3333/api/games",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    {
      name: "bdd",
      testDir: bddTestDir,
      use: { 
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
        baseURL: "http://127.0.0.1:3333",
      },
    },
  ],
});
