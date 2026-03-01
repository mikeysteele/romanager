import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  testDir,
  reporter: "html",
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
