import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.ts",
  reporter: "html",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:8000",
  },
});
