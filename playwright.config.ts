import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const bddTestDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "PORT=3333 deno run --allow-net --allow-read --allow-write --allow-env --allow-sys --allow-ffi apps/api/main.ts",
    url: "http://127.0.0.1:3333/api/games",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    {
      name: "bdd",
      testDir: bddTestDir,
      use: { 
        ...devices["Desktop Chrome"],
        channel: "chrome",
        baseURL: "http://127.0.0.1:3333",
      },
    },
  ],
});
