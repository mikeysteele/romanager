import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import createServer from "./src/app.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDir = path.resolve(__dirname, "../ui/dist");
const ROMS_DIR = process.env.ROMS_DIR || path.resolve(__dirname, "../../roms");
const APP_DIR = process.env.APP_DIR ? path.resolve(process.cwd(), process.env.APP_DIR) : defaultAppDir;
const PORT = Number(process.env.PORT) || 8000;

const app = createServer(ROMS_DIR, APP_DIR);

console.log(`Server running on http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });
