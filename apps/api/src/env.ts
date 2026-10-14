import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check possible .env locations: CWD, apps/api root, and monorepo root
const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(envPath);
      } catch {
        dotenv.config({ path: envPath });
      }
    } else {
      dotenv.config({ path: envPath });
    }
  }
}
