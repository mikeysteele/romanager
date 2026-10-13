import process from "node:process";
import { UniversalWorker } from "../apps/api/src/worker-adapter.ts";

process.env.DB_URL = process.env.DB_URL || "file:test.db";

if (typeof (globalThis as any).Worker === "undefined") {
  (globalThis as any).Worker = UniversalWorker;
}
