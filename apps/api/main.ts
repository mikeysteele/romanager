import "dotenv/config";
import { serve } from "@hono/node-server";
import createServer from "./src/app.ts";

const ROMS_DIR = process.env.ROMS_DIR || "./roms";
const APP_DIR = process.env.APP_DIR || "./apps/ui/dist";
const PORT = Number(process.env.PORT) || 8000;

const app = createServer(ROMS_DIR, APP_DIR);

console.log(`Server running on http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });
