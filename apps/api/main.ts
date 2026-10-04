
import { load } from "@std/dotenv";

// Load environment variables before initializing DB and server modules
await load({
  envPath: ".env",
  export: true,
});

import createServer from "./src/app.ts";

const ROMS_DIR = Deno.env.get("ROMS_DIR") || "./roms";
const APP_DIR = Deno.env.get("APP_DIR") || "./apps/ui/dist";
const PORT = Number(Deno.env.get("PORT")) || 8000;

const app = createServer(ROMS_DIR, APP_DIR);

console.log(`Server running on http://localhost:${PORT}`);
if (import.meta.main) {
  Deno.serve({ port: PORT }, app.fetch);
}

