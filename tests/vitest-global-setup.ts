import { execSync } from "node:child_process";

export default function setup() {
  process.env.DB_URL = process.env.DB_URL || "file:test.db";
  
  // Ensure fresh or current test database exists
  try {
    execSync("pnpm --filter @romanager/api db:push", {
      stdio: "pipe",
      env: { ...process.env, DB_URL: "file:test.db" },
    });
  } catch (err) {
    console.warn("Global setup db:push warning:", err);
  }
}
