
import createServer from "./src/app.ts";
import { load } from "@std/dotenv";

// Configuration (could be moved to env or config file)
const ROMS_DIR = "./roms";
const APP_DIR = "./apps/ui/www";
const app = createServer(ROMS_DIR, APP_DIR);
await load({
  // optional: choose a specific path (defaults to ".env")
  envPath: ".env",
  // optional: also export to the process environment (so Deno.env can read it)
  export: true,
});

console.log(`Server running on http://localhost:8000`);
// Only serve if this is the main module
if (import.meta.main) {
  Deno.serve({ port: 8000 }, app.fetch);
}

