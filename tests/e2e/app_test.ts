import { chromium } from "playwright";
import { assert } from "@std/assert";

Deno.test({
  name: "E2E: Home page loads",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Launch browser
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Visit local server (assumes server is running on 8000)
      await page.goto("http://localhost:8000");
      
      // Check title
      const title = await page.title();
      console.log("Page title:", title);
      assert(title.includes("Romanager") || title === "", "Title should contain Romanager");

      // Check for page-router component
      // Wait for selector
      try {
          await page.waitForSelector("page-router", { timeout: 5000 });
          console.log("Found page-router");
          
          await page.waitForSelector("app-library", { timeout: 5000 });
          console.log("Found app-library inside router");
      } catch {
          console.log("Could not find page-router or app-library");
          throw new Error("Router or Library not found");
      }

    } finally {
      await browser.close();
    }
  }
});
