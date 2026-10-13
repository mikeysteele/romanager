import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const bddTestDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "DB_URL=file:test-bdd.db npx drizzle-kit push --config=apps/api/drizzle.config.ts > /dev/null && DB_URL=file:test-bdd.db PORT=3333 deno run --allow-net --allow-read --allow-write --allow-env --allow-sys --allow-ffi apps/api/main.ts",
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
