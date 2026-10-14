import path from "node:path";
import { fileURLToPath } from "node:url";
import { UniversalWorker } from "../apps/api/src/worker-adapter.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "../test.db");
process.env.DB_URL = process.env.DB_URL || `file:${testDbPath}`;

if (typeof (globalThis as any).Worker === "undefined") {
  (globalThis as any).Worker = UniversalWorker;
}
