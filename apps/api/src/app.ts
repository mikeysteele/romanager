import { serveStatic } from "@hono/hono/serve-static";
import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { eventBus } from "./sse.ts";
import { webdav } from "./webdav.ts";

// Import modular routers
import { gamesRouter } from "./routes/games.ts";
import { systemsRouter } from "./routes/systems.ts";
import { romsRouter } from "./routes/roms.ts";
import { createScansRouter } from "./routes/scans.ts";
import { importRouter } from "./routes/import.ts";
import { createSettingsRouter } from "./routes/settings.ts";
import { metadataRouter } from "./routes/metadata.ts";
import { eventsRouter } from "./routes/events.ts";
import { unmappedRouter } from "./routes/unmapped.ts";

export default function createServer(romsDir: string, appDir: string) {
    const app = new Hono();

    app.use("/*", cors());

    // Initialize Worker
    const worker = new Worker(new URL("./workers/scanner.ts", import.meta.url).href, { type: "module" });
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress' || msg.type === 'done' || msg.type === 'error') {
            eventBus.emit('sse-message', msg);
        }
    };

    // Mount WebDAV
    webdav(app, romsDir);

    // API Routes mapping
    app.get("/api/health", (c) => c.json({ status: "ok" }));
    app.route("/api/events", eventsRouter);
    app.route("/api/games", gamesRouter);
    app.route("/api/systems", systemsRouter);
    app.route("/api/roms", romsRouter);
    app.route("/api/scans", createScansRouter(worker, romsDir));
    app.route("/api/scan", createScansRouter(worker, romsDir)); // The POST runs here too
    app.route("/api/import", importRouter);
    app.route("/api/settings", createSettingsRouter(worker));
    app.route("/api/metadata", metadataRouter);
    app.route("/api/unmapped", unmappedRouter);

    // Serve frontend
    app.use("/*", serveStatic({
        root: appDir,
        getContent: async (path, c) => {
            try {
                // ... logging removed for terseness or keep it if debug needed
                return await Deno.readFile(path);
            } catch (e) {
                if (e instanceof Deno.errors.IsADirectory) {
                    try {
                        const indexPath = path.endsWith("/") ? `${path}index.html` : `${path}/index.html`;
                        const data = await Deno.readFile(indexPath);
                        return c.body(data, 200, { "Content-Type": "text/html" });
                    } catch {
                        return null;
                    }
                }
                return null;
            }
        },
    }));
    return app;
}
