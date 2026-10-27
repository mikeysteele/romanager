import { loadEnv } from "./src/env.ts";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import createServer from "./src/app.ts";
import { runMigrations } from "./src/db/migrate.ts";

// Load environment variables before resolving defaults
loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveAppDir(dirFromEnv: string | undefined, baseDir: string): string {
  const candidates = [
    ...(dirFromEnv
      ? [
          resolve(process.cwd(), dirFromEnv),
          resolve(baseDir, dirFromEnv),
          resolve(baseDir, "..", dirFromEnv),
          resolve(baseDir, "../..", dirFromEnv),
          resolve(baseDir, "../../..", dirFromEnv),
        ]
      : []),
    resolve(baseDir, "../ui/dist"),
    resolve(baseDir, "../../ui/dist"),
    resolve(process.cwd(), "apps/ui/dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(resolve(candidate, "index.html")) || fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

const apiRoot = __dirname.endsWith("/dist") || __dirname.endsWith("\\dist") ? resolve(__dirname, "..") : __dirname;
const ROMS_DIR = process.env.ROMS_DIR || resolve(apiRoot, "../../roms");
const APP_DIR = resolveAppDir(process.env.APP_DIR, apiRoot);
const PORT = Number(process.env.PORT) || 8000;

// Apply pending database migrations on boot before listening
await runMigrations();

const app = createServer(ROMS_DIR, APP_DIR);

console.log(`Server running on http://localhost:${PORT} (UI: ${APP_DIR})`);
serve({ fetch: app.fetch, port: PORT });
