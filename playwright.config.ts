import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  testDir,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "deno run --allow-net --allow-read --allow-write --allow-env --allow-sys --allow-ffi apps/api/main.ts",
    url: "http://127.0.0.1:3333/api/games",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        baseURL: 'http://127.0.0.1:3333',
      },
    },
  ],
});
