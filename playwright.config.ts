import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const bddTestDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "DB_URL=file:test-bdd.db pnpm --filter @romanager/api db:push && DB_URL=file:test-bdd.db PORT=3333 pnpm --filter @romanager/api start",
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
