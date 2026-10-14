import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function setup() {
  const rootDir = path.resolve(__dirname, "..");
  const testDbPath = path.resolve(rootDir, "test.db");
  const dbUrl = `file:${testDbPath}`;
  process.env.DB_URL = dbUrl;
  
  // Ensure fresh test database schema is pushed
  execSync(`pnpm --filter @romanager/api exec drizzle-kit push --config=drizzle.config.ts`, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, DB_URL: dbUrl },
  });
}
